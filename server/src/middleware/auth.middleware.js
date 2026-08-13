import jwt from "jsonwebtoken";

export const authenticate = (
    req,
    res,
    next
) => {
    try {
        const token =
            req.cookies?.accessToken;

        if (!token) {
            const error = new Error(
                "Authentication required"
            );

            error.statusCode = 401;

            return next(error);
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = {
            id: decoded.id,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (
            error.name ===
            "TokenExpiredError"
        ) {
            error.statusCode = 401;
            error.message =
                "Access token expired";
        }

        if (
            error.name ===
            "JsonWebTokenError"
        ) {
            error.statusCode = 401;
            error.message =
                "Invalid access token";
        }

        next(error);
    }
};