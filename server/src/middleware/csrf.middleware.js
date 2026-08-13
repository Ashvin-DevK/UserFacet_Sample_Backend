import crypto from "crypto";

const SAFE_METHODS = new Set([
    "GET",
    "HEAD",
    "OPTIONS"
]);

export const csrfProtection = (
    req,
    res,
    next
) => {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const cookieToken =
        req.cookies?.csrfToken;

    const headerToken =
        req.headers["x-csrf-token"];

    if (
        !cookieToken ||
        !headerToken ||
        cookieToken.length !== headerToken.length ||
        !crypto.timingSafeEqual(
            Buffer.from(cookieToken),
            Buffer.from(headerToken)
        )
    ) {
        const error = new Error(
            "CSRF validation failed"
        );

        error.statusCode = 403;

        return next(error);
    }

    next();
};