import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/user.model.js";
import RefreshToken from "../models/refresh-token.model.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_DAYS = 7;

const MAX_FAILED_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN
        }
    );
};

const generateRefreshToken = () => {
    return crypto
        .randomBytes(64)
        .toString("hex");
};

const generateFamilyId = () => {
    return crypto
        .randomBytes(32)
        .toString("hex");
};

const hashRefreshToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

const createRefreshTokenRecord = async (
    userId,
    token,
    familyId
) => {
    const expiresAt = new Date(
        Date.now() +
        REFRESH_TOKEN_DAYS *
        24 *
        60 *
        60 *
        1000
    );

    return RefreshToken.create({
        user: userId,
        tokenHash: hashRefreshToken(token),
        familyId,
        expiresAt
    });
};

const getSafeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
});

export const registerUser = async ({
    name,
    email,
    password
}) => {
    const existingUser = await User.findOne({
        email
    });

    if (existingUser) {
        const error = new Error(
            "User already exists"
        );

        error.statusCode = 409;
        throw error;
    }

    const hashedPassword =
        await bcrypt.hash(password, 12);

    try {
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "user"
        });

        return getSafeUser(user);
    } catch (error) {
        if (error.code === 11000) {
            const duplicateError = new Error(
                "User already exists"
            );

            duplicateError.statusCode = 409;
            throw duplicateError;
        }

        throw error;
    }
};

export const loginUser = async ({
    email,
    password
}) => {
    const user = await User
        .findOne({ email })
        .select("+password");

    if (!user) {
        const error = new Error(
            "Invalid credentials"
        );

        error.statusCode = 401;
        throw error;
    }

    if (!user.isActive) {
        const error = new Error(
            "Invalid credentials"
        );

        error.statusCode = 401;
        throw error;
    }

    if (
        user.lockUntil &&
        user.lockUntil > new Date()
    ) {
        const error = new Error(
            "Account temporarily locked"
        );

        error.statusCode = 423;
        throw error;
    }

    if (
        user.lockUntil &&
        user.lockUntil <= new Date()
    ) {
        user.lockUntil = null;
        user.failedLoginAttempts = 0;
    }

    const passwordMatches =
        await bcrypt.compare(
            password,
            user.password
        );

    if (!passwordMatches) {
        user.failedLoginAttempts += 1;

        if (
            user.failedLoginAttempts >=
            MAX_FAILED_ATTEMPTS
        ) {
            user.lockUntil =
                new Date(
                    Date.now() +
                    LOCK_DURATION_MS
                );

            user.failedLoginAttempts = 0;
        }

        await user.save();

        const error = new Error(
            "Invalid credentials"
        );

        error.statusCode = 401;
        throw error;
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    await user.save();

    const accessToken =
        generateAccessToken(user);

    const refreshToken =
        generateRefreshToken();

    const familyId =
        generateFamilyId();
    
    await createRefreshTokenRecord(
        user._id,
        refreshToken,
        familyId
    );


    return {
        accessToken,
        refreshToken,
        user: getSafeUser(user)
    };
};

export const refreshAccessToken = async (
    refreshToken
) => {
    if (!refreshToken) {
        const error = new Error(
            "Refresh token required"
        );

        error.statusCode = 401;
        throw error;
    }

    const tokenHash =
        hashRefreshToken(refreshToken);

    const storedToken =
        await RefreshToken.findOne({
            tokenHash
        }).populate("user");

    if (!storedToken) {
        const error = new Error(
            "Invalid refresh token"
        );

        error.statusCode = 401;
        throw error;
    }

    if (storedToken.revokedAt) {
        await RefreshToken.updateMany(
            {
                familyId: storedToken.familyId,
                revokedAt: null
            },
            {
                $set: {
                    revokedAt: new Date()
                }
            }
        );

        const error = new Error(
            "Refresh token reuse detected"
        );

        error.statusCode = 401;
        throw error;
    }

    if (
        storedToken.expiresAt <= new Date()
    ) {
        const error = new Error(
            "Invalid refresh token"
        );

        error.statusCode = 401;
        throw error;
    }

    const user = storedToken.user;

    if (!user || !user.isActive) {
        const error = new Error(
            "Invalid refresh token"
        );

        error.statusCode = 401;
        throw error;
    }

    const newRefreshToken =
        generateRefreshToken();

    const newRefreshTokenRecord =
        await createRefreshTokenRecord(
            user._id,
            newRefreshToken,
            storedToken.familyId
        );

    storedToken.revokedAt =
        new Date();

    storedToken.replacedBy =
        newRefreshTokenRecord._id;

    await storedToken.save();

    const accessToken =
        generateAccessToken(user);

    return {
        accessToken,
        refreshToken: newRefreshToken
    };
};

export const logoutUser = async (
    refreshToken
) => {
    if (!refreshToken) {
        return;
    }

    const tokenHash =
        hashRefreshToken(refreshToken);

    const storedToken =
        await RefreshToken.findOne({
            tokenHash
        });

    if (!storedToken) {
        return;
    }

    await RefreshToken.updateMany(
        {
            familyId: storedToken.familyId,
            revokedAt: null
        },
        {
            $set: {
                revokedAt: new Date()
            }
        }
    );
};

export const getUserById = async (
    userId
) => {
    const user = await User.findById(
        userId
    );

    if (!user) {
        const error = new Error(
            "User not found"
        );

        error.statusCode = 404;
        throw error;
    }

    return getSafeUser(user);
};