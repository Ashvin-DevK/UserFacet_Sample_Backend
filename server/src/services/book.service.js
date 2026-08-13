import mongoose from "mongoose"
import Book from "../models/book.model.js";
import { generateBookSummary } from "./ai.service.js";
import Borrow from "../models/borrow.model.js";
import Reservation from "../models/reservation.model.js";

export const createBook = async (bookData) => {
    try {
        return await Book.create({
            title: bookData.title,
            description: bookData.description,
            isbn: bookData.isbn,
            authors: bookData.authors,
            categories: bookData.categories,
            publisher: bookData.publisher,
            publishedYear: bookData.publishedYear,
            language: bookData.language,
            coverImage: bookData.coverImage,
            totalCopies: bookData.totalCopies,
            availableCopies: bookData.totalCopies
        });
    } catch (error) {
        if (error.code === 11000) {
            const duplicateError = new Error(
                "Book with this ISBN already exists"
            );

            duplicateError.statusCode = 409;

            throw duplicateError;
        }

        throw error;
    }
};

export const getBooks = async ({
    search,
    category,
    author,
    page,
    limit
}) => {
    const filter = {
        isActive: true
    };

    if (search) {
        filter.$text = {
            $search: search
        };
    }

    if (category) {
        filter.categories = category.toLowerCase();
    }

    if (author) {
        filter.authors = author;
    }

    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
        Book.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        Book.countDocuments(filter)
    ]);

    return {
        books,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(
                total / limit
            )
        }
    };
};

export const getBookById = async (bookId) => {
    if (!mongoose.isValidObjectId(bookId)) {
        const error = new Error("Invalid book ID");
        error.statusCode = 400;
        throw error;
    }

    const book = await Book.findOne({
        _id: bookId,
        isActive: true
    }).lean();

    if (!book) {
        const error = new Error("Book not found");
        error.statusCode = 404;
        throw error;
    }

    return book;
};


export const getBookSummary = async (bookId) => {
    const GENERATION_TIMEOUT_MS = 2 * 60 * 1000;
    const MAX_ATTEMPTS = 50;
    const POLL_INTERVAL_MS = 200;

    const book = await Book.findOne({
        _id: bookId,
        isActive: true
    });

    if (!book) {
        const error = new Error("Book not found");
        error.statusCode = 404;
        throw error;
    }

    if (
        book.aiSummary &&
        book.aiSummaryStatus === "completed"
    ) {
        return {
            summary: book.aiSummary,
            generatedAt: book.aiSummaryGeneratedAt,
            cached: true
        };
    }

    const staleBefore = new Date(
        Date.now() - GENERATION_TIMEOUT_MS
    );

    const lock = await Book.findOneAndUpdate(
        {
            _id: bookId,
            isActive: true,
            $or: [
                {
                    aiSummaryStatus: "not_generated"
                },
                {
                    aiSummaryStatus: "generating",
                    aiSummaryGenerationStartedAt: {
                        $lte: staleBefore
                    }
                }
            ]
        },
        {
            $set: {
                aiSummaryStatus: "generating",
                aiSummaryGenerationStartedAt: new Date()
            }
        },
        {
            new: true
        }
    );

    if (lock) {
        try {
            const summary =
                await generateBookSummary(lock);

            const generatedAt = new Date();

            await Book.findByIdAndUpdate(
                bookId,
                {
                    $set: {
                        aiSummary: summary,
                        aiSummaryGeneratedAt: generatedAt,
                        aiSummaryStatus: "completed"
                    },
                    $unset: {
                        aiSummaryGenerationStartedAt: 1
                    }
                }
            );

            return {
                summary,
                generatedAt,
                cached: false
            };
        } catch (error) {
            await Book.findByIdAndUpdate(
                bookId,
                {
                    $set: {
                        aiSummaryStatus: "not_generated"
                    },
                    $unset: {
                        aiSummaryGenerationStartedAt: 1
                    }
                }
            );

            throw error;
        }
    }

    for (
        let attempt = 0;
        attempt < MAX_ATTEMPTS;
        attempt++
    ) {
        const updatedBook = await Book.findOne({
            _id: bookId,
            isActive: true
        });

        if (
            updatedBook?.aiSummary &&
            updatedBook.aiSummaryStatus === "completed"
        ) {
            return {
                summary: updatedBook.aiSummary,
                generatedAt:
                    updatedBook.aiSummaryGeneratedAt,
                cached: true
            };
        }

        const currentStaleBefore = new Date(
            Date.now() - GENERATION_TIMEOUT_MS
        );

        const retryLock =
            await Book.findOneAndUpdate(
                {
                    _id: bookId,
                    isActive: true,
                    $or: [
                        {
                            aiSummaryStatus: "not_generated"
                        },
                        {
                            aiSummaryStatus: "generating",
                            aiSummaryGenerationStartedAt: {
                                $lte: currentStaleBefore
                            }
                        }
                    ]
                },
                {
                    $set: {
                        aiSummaryStatus: "generating",
                        aiSummaryGenerationStartedAt: new Date()
                    }
                },
                {
                    new: true
                }
            );

        if (retryLock) {
            try {
                const summary =
                    await generateBookSummary(
                        retryLock
                    );

                const generatedAt = new Date();

                await Book.findByIdAndUpdate(
                    bookId,
                    {
                        $set: {
                            aiSummary: summary,
                            aiSummaryGeneratedAt:
                                generatedAt,
                            aiSummaryStatus:
                                "completed"
                        },
                        $unset: {
                            aiSummaryGenerationStartedAt: 1
                        }
                    }
                );

                return {
                    summary,
                    generatedAt,
                    cached: false
                };
            } catch (error) {
                await Book.findByIdAndUpdate(
                    bookId,
                    {
                        $set: {
                            aiSummaryStatus:
                                "not_generated"
                        },
                        $unset: {
                            aiSummaryGenerationStartedAt:
                                1
                        }
                    }
                );

                throw error;
            }
        }

        await new Promise(resolve =>
            setTimeout(
                resolve,
                POLL_INTERVAL_MS
            )
        );
    }

    const error = new Error(
        "Summary generation timed out. Please try again."
    );

    error.statusCode = 503;

    throw error;
};

export const updateBook = async (
    bookId,
    bookData
) => {
    if (!mongoose.isValidObjectId(bookId)) {
        const error = new Error("Invalid book ID");
        error.statusCode = 400;
        throw error;
    }

    const book = await Book.findOne({
        _id: bookId,
        isActive: true
    });

    if (!book) {
        const error = new Error("Book not found");
        error.statusCode = 404;
        throw error;
    }

    if (
        bookData.isbn &&
        bookData.isbn !== book.isbn
    ) {
        const existingBook = await Book.findOne({
            isbn: bookData.isbn,
            _id: {
                $ne: bookId
            }
        });

        if (existingBook) {
            const error = new Error(
                "Book with this ISBN already exists"
            );

            error.statusCode = 409;
            throw error;
        }
    }

    if (
        bookData.totalCopies !== undefined
    ) {
        const borrowedCopies =
            book.totalCopies -
            book.availableCopies;

        if (
            bookData.totalCopies <
            borrowedCopies
        ) {
            const error = new Error(
                `Total copies cannot be less than the ${borrowedCopies} copies currently borrowed`
            );

            error.statusCode = 409;
            throw error;
        }

        const copiesDifference =
            bookData.totalCopies -
            book.totalCopies;

        book.availableCopies +=
            copiesDifference;
    }

    const aiRelevantFieldsChanged =
        bookData.title !== undefined ||
        bookData.description !== undefined ||
        bookData.authors !== undefined ||
        bookData.categories !== undefined;

    Object.assign(book, bookData);

    if (aiRelevantFieldsChanged) {
        book.aiSummary = null;
        book.aiSummaryGeneratedAt = null;
        book.aiSummaryStatus = "not_generated";
        book.aiSummaryGenerationStartedAt = null;
    }

    await book.save();

    return book;
};

export const deactivateBook = async (bookId) => {
    if (!mongoose.isValidObjectId(bookId)) {
        const error = new Error("Invalid book ID");
        error.statusCode = 400;
        throw error;
    }

    const book = await Book.findOne({
        _id: bookId,
        isActive: true
    });

    if (!book) {
        const error = new Error("Book not found");
        error.statusCode = 404;
        throw error;
    }

    const activeBorrow = await Borrow.findOne({
        book: bookId,
        status: {
            $in: ["borrowed", "overdue"]
        }
    });

    if (activeBorrow) {
        const error = new Error(
            "Cannot deactivate a book with active borrowings"
        );

        error.statusCode = 409;
        throw error;
    }

    const activeReservation = await Reservation.findOne({
        book: bookId,
        status: {
            $in: ["waiting", "ready"]
        }
    });

    if (activeReservation) {
        const error = new Error(
            "Cannot deactivate a book with active reservations"
        );

        error.statusCode = 409;
        throw error;
    }

    book.isActive = false;

    await book.save();

    return book;
};