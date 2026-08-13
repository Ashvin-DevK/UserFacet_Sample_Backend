import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import bookRoutes from "./routes/book.routes.js";
import authRoutes from "./routes/auth.routes.js";
import borrowRoutes from "./routes/borrow.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import adminAnalyticsRoutes from "./routes/admin-analytics.routes.js";

import { errorHandler } from "./middleware/error.middleware.js";
import {
    generalRateLimiter
} from "./middleware/rateLimit.middleware.js";

const app = express();

app.use(helmet());

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true
    })
);

app.use(generalRateLimiter);

app.use(express.json());

app.use(cookieParser());

app.use(morgan("dev"));

app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "E-Library API is running"
    });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/books", bookRoutes);
app.use("/api/v1/borrow", borrowRoutes);
app.use("/api/v1/reservations", reservationRoutes);

app.use(
    "/api/v1/admin/analytics",
    adminAnalyticsRoutes
);

app.use(errorHandler);

export default app;