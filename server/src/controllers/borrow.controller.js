import {
    borrowBook,
    returnBook,
    getMyBorrows
} from "../services/borrow.service.js";

export const getMyBorrowsController = async (req, res, next) => {
  try {
    
    const userId = req.user.id;

    const borrows = await getMyBorrows(userId);

    return res.status(200).json({
      success: true,
      message: "Borrowed books fetched successfully",
      count: borrows.length,
      data: borrows,
    });
  } catch (error) {
    next(error);
  }
};


export const borrow = async (req, res, next) => {
    try {
        const result = await borrowBook(
            req.user.id,
            req.params.bookId
        );

        res.status(201).json({
            success: true,
            message: "Book borrowed successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const returnBorrowedBook = async (
    req,
    res,
    next
) => {
    try {
        const result = await returnBook(
            req.user.id,
            req.params.borrowId
        );

        res.status(200).json({
            success: true,
            message: "Book returned successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getHistory = async (
    req,
    res,
    next
) => {
    try {
        const result = await getMyBorrows(
            req.user.id
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};



