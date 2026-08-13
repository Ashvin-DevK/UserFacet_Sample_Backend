import rateLimit from "express-rate-limit";

export const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

export const aiRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "AI request limit exceeded. Please try again later."
    }
});