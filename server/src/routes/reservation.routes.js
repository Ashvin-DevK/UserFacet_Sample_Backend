import { Router } from "express";

import {
    reserve,
    getMine,
    cancel
} from "../controllers/reservation.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();

router.post(
    "/:bookId",
    authenticate,
    reserve
);

router.get(
    "/mine",
    authenticate,
    getMine
);

router.delete(
    "/:reservationId",
    authenticate,
    cancel
);

export default router;