import { Router } from "express";

import {
    getAnalytics
} from "../controllers/admin-analytics.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.get(
    "/",
    authenticate,
    authorize("admin"),
    getAnalytics
);

export default router;