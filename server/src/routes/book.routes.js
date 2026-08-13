import { Router } from "express";

import {
    create,
    getAll,
    getOne,
    getSummary,
    update,
    deactivate
} from "../controllers/book.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

import {
    aiRateLimiter
} from "../middleware/rateLimit.middleware.js";

const router = Router();

router.get(
    "/",
    getAll
);

router.get(
    "/:id/summary",
    aiRateLimiter,
    getSummary
);

router.get(
    "/:id",
    getOne
);

router.post(
    "/",
    authenticate,
    authorize("admin"),
    create
);

router.patch(
    "/:id",
    authenticate,
    authorize("admin"),
    update
);

router.delete(
    "/:id",
    authenticate,
    authorize("admin"),
    deactivate
);

export default router;