import {
    createBook,
    getBooks,
    getBookById,
    getBookSummary,
    updateBook,
    deactivateBook
} from "../services/book.service.js";

import {
    createBookSchema,
    getBooksQuerySchema,
    updateBookSchema
} from "../validators/book.validator.js";

export const create = async (req, res, next) => {
    try {
        const validatedData = createBookSchema.parse(req.body);

        const book = await createBook(validatedData);

        res.status(201).json({
            success: true,
            message: "Book created successfully",
            data: book
        });
    } catch (error) {
        next(error);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const query = getBooksQuerySchema.parse(
            req.query
        );

        const result = await getBooks(query);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getOne = async (req, res, next) => {
    try {
        const book = await getBookById(req.params.id);

        res.status(200).json({
            success: true,
            data: book
        });
    } catch (error) {
        next(error);
    }
};

export const getSummary = async (
    req,
    res,
    next
) => {
    try {
        const result = await getBookSummary(
            req.params.id
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const update = async (
    req,
    res,
    next
) => {
    try {
        const validatedData =
            updateBookSchema.parse(req.body);

        const book = await updateBook(
            req.params.id,
            validatedData
        );

        res.status(200).json({
            success: true,
            message: "Book updated successfully",
            data: book
        });
    } catch (error) {
        next(error);
    }
};

export const deactivate = async (
    req,
    res,
    next
) => {
    try {
        const book = await deactivateBook(
            req.params.id
        );

        res.status(200).json({
            success: true,
            message: "Book deactivated successfully",
            data: book
        });
    } catch (error) {
        next(error);
    }
};