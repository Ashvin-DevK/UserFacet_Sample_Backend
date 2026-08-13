import Reservation from "../models/reservation.model.js";
import Book from "../models/book.model.js";
import Borrow from "../models/borrow.model.js";
import ReservationCounter from "../models/reservation-counter.model.js";

export const createReservation = async (
    userId,
    bookId
) => {
    const book = await Book.findOne({
        _id: bookId,
        isActive: true
    });

    if (!book) {
        const error = new Error("Book not found");
        error.statusCode = 404;
        throw error;
    }

    if (book.availableCopies > 0) {
        const error = new Error(
            "Book is currently available. You can borrow it directly."
        );

        error.statusCode = 409;
        throw error;
    }

    const activeBorrow = await Borrow.findOne({
        user: userId,
        book: bookId,
        status: {
            $in: ["borrowed", "overdue"]
        }
    });

    if (activeBorrow) {
        const error = new Error(
            "You already have this book"
        );

        error.statusCode = 409;
        throw error;
    }

    const existingReservation =
        await Reservation.findOne({
            user: userId,
            book: bookId,
            status: {
                $in: ["waiting", "ready"]
            }
        });

    if (existingReservation) {
        const error = new Error(
            "You already have a reservation for this book"
        );

        error.statusCode = 409;
        throw error;
    }

const counter =
    await ReservationCounter.findOneAndUpdate(
        {
            book: bookId
        },
        {
            $inc: {
                nextPosition: 1
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            session
        }
    );

const position = counter.nextPosition;
    try {
        return await Reservation.create({
            user: userId,
            book: bookId,
            position,
            status:"waiting",
            expiresAt: null
        });
    } catch (error) {

        if (error.code === 11000) {
            const duplicateError = new Error(
                "You already have a reservation for this book"
            );

            duplicateError.statusCode = 409;
            throw duplicateError;
        }

        throw error;
    }
};

export const getMyReservations = async (userId) => {
    return Reservation.find({
        user: userId
    })
        .populate(
            "book",
            "title authors coverImage"
        )
        .sort({
            createdAt: -1
        });
};

export const cancelReservation = async (
    userId,
    reservationId
) => {
    const reservation =
        await Reservation.findOne({
            _id: reservationId,
            user: userId,
            status: {
                $in: ["waiting", "ready"]
            }
        });

    if (!reservation) {
        const error = new Error(
            "Active reservation not found"
        );

        error.statusCode = 404;
        throw error;
    }

    reservation.status = "cancelled";

    await reservation.save();

    return reservation;
};

export const promoteNextReservation = async (
    bookId,
    session = null
) => {
    const query = Reservation.findOne({
        book: bookId,
        status: "waiting"
    }).sort({
        position: 1
    });

    if (session) {
        query.session(session);
    }

    const reservation = await query;

    if (!reservation) {
        return null;
    }

    reservation.status = "ready";

    reservation.expiresAt = new Date(
        Date.now() + 48 * 60 * 60 * 1000
    );

    await reservation.save(
        session
            ? { session }
            : undefined
    );

    return reservation;
};

export const expireReservations = async () => {
    const now = new Date();

    const expiredReservations =
        await Reservation.find({
            status: "ready",
            expiresAt: {
                $lte: now
            }
        });

    for (const reservation of expiredReservations) {
        reservation.status = "expired";
        reservation.expiresAt = null;

        await reservation.save();

        await promoteNextReservation(
            reservation.book
        );
    }

    return expiredReservations.length;
};