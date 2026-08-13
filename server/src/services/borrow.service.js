import mongoose from "mongoose";

import Borrow from "../models/borrow.model.js";
import Book from "../models/book.model.js";
import User from "../models/user.model.js";
import Reservation from "../models/reservation.model.js";

import { promoteNextReservation } from "./reservation.service.js";

const BORROW_DURATION_DAYS = 14;
const MAX_ACTIVE_BORROWS = 5;
const FINE_PER_DAY = 10;
const RESERVATION_HOLD_HOURS = 48;

const validateObjectId = (id, fieldName) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(`Invalid ${fieldName}`);

    error.statusCode = 400;
    throw error;
  }
};

const calculateFine = (dueAt, date = new Date()) => {
  const overdueMilliseconds = date.getTime() - dueAt.getTime();

  if (overdueMilliseconds <= 0) {
    return 0;
  }

  const overdueDays = Math.ceil(overdueMilliseconds / (1000 * 60 * 60 * 24));

  return overdueDays * FINE_PER_DAY;
};

export const borrowBook = async (userId, bookId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(bookId, "book ID");

  const session = await mongoose.startSession();

  try {
    let borrow;

    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);

      if (!user) {
        const error = new Error("User not found");

        error.statusCode = 404;
        throw error;
      }

      if (!user.isActive) {
        const error = new Error("Account is disabled");

        error.statusCode = 403;
        throw error;
      }

      const book = await Book.findOne({
        _id: bookId,
        isActive: true,
      }).session(session);

      if (!book) {
        const error = new Error("Book not found");

        error.statusCode = 404;
        throw error;
      }

      const existingBorrow = await Borrow.findOne({
        user: userId,
        book: bookId,
        status: {
          $in: ["borrowed", "overdue"],
        },
      }).session(session);

      if (existingBorrow) {
        const error = new Error("You already have this book");

        error.statusCode = 409;
        throw error;
      }

      const now = new Date();

      const readyReservation = await Reservation.findOne({
        book: bookId,
        status: "ready",
        expiresAt: {
          $gt: now,
        },
      })
        .sort({
          position: 1,
        })
        .session(session);

      if (
        readyReservation &&
        readyReservation.user.toString() !== userId.toString()
      ) {
        const error = new Error("This book is reserved for another user");

        error.statusCode = 409;
        throw error;
      }

      const activeBorrowCount = await Borrow.countDocuments({
        user: userId,
        status: {
          $in: ["borrowed", "overdue"],
        },
      }).session(session);

      if (activeBorrowCount >= MAX_ACTIVE_BORROWS) {
        const error = new Error(
          `Maximum of ${MAX_ACTIVE_BORROWS} active books allowed`,
        );

        error.statusCode = 409;
        throw error;
      }

      const updatedBook = await Book.findOneAndUpdate(
        {
          _id: bookId,
          isActive: true,
          availableCopies: {
            $gt: 0,
          },
        },
        {
          $inc: {
            availableCopies: -1,
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedBook) {
        const error = new Error("No copies available");

        error.statusCode = 409;
        throw error;
      }

      const dueAt = new Date(
        now.getTime() + BORROW_DURATION_DAYS * 24 * 60 * 60 * 1000,
      );

      try {
        const createdBorrow = await Borrow.create(
          [
            {
              user: userId,
              book: bookId,
              borrowedAt: now,
              dueAt,
              fine: 0,
              status: "borrowed",
            },
          ],
          {
            session,
          },
        );

        borrow = createdBorrow[0];
      } catch (error) {
        if (error.code === 11000) {
          const duplicateError = new Error("You already have this book");

          duplicateError.statusCode = 409;

          throw duplicateError;
        }

        throw error;
      }

      if (readyReservation) {
        readyReservation.status = "fulfilled";

        readyReservation.expiresAt = null;

        await readyReservation.save({
          session,
        });
      }
    });

    return borrow;
  } finally {
    await session.endSession();
  }
};

export const returnBook = async (userId, borrowId) => {
  validateObjectId(userId, "user ID");
  validateObjectId(borrowId, "borrow ID");

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const borrow = await Borrow.findOne({
        _id: borrowId,
        user: userId,
        status: {
          $in: ["borrowed", "overdue"],
        },
      }).session(session);

      if (!borrow) {
        const error = new Error("Active borrowing record not found");

        error.statusCode = 404;
        throw error;
      }

      const book = await Book.findById(borrow.book).session(session);

      if (!book) {
        const error = new Error("Book not found");
        error.statusCode = 404;
        throw error;
      }

      const now = new Date();

      if (now > borrow.dueAt) {
        borrow.fine = calculateFine(borrow.dueAt, now);

        borrow.fineCalculatedAt = now;
      }

      borrow.status = "returned";
      borrow.returnedAt = now;

      const updatedBook =
    await Book.findOneAndUpdate(
        {
            _id: borrow.book
        },
        {
            $inc: {
                availableCopies: 1
            }
        },
        {
            new: true,
            session
        }
    );

      if (!updatedBook) {
        const error = new Error("Unable to update book availability");

        error.statusCode = 500;
        throw error;
      }

      await borrow.save({
        session,
      });

      const reservation = await promoteNextReservation(borrow.book, session);

      result = {
        borrow,
        reservation,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};

export const getMyBorrows = async (userId) => {
  validateObjectId(userId, "user ID");

  return Borrow.find({
    user: userId,
  })
    .populate("book", "title authors coverImage")
    .sort({
      createdAt: -1,
    });
};
