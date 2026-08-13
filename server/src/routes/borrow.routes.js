import { Router } from "express";

import {
    borrow,
    returnBorrowedBook,
    getHistory,
    getMyBorrowsController
} from "../controllers/borrow.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();


router.get(
    "/history",
    authenticate,
    getHistory
);

router.get(
  "/my",
  authenticate,
  getMyBorrowsController
);


router.post(
    "/:bookId",
    authenticate,
    borrow
);



router.post(
    "/:borrowId/return",
    authenticate,
    returnBorrowedBook
);




export default router;