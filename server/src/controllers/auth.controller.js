import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserById,
} from "../services/auth.service.js";

import { registerSchema, loginSchema } from "../validators/auth.validator.js";

import {
  accessCookieOptions,
  refreshCookieOptions,
} from "../config/cookie.config.js";


const isProduction = process.env.NODE_ENV === "production";


export const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const user = await registerUser(validatedData);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const result = await loginUser(validatedData);

    res
      .cookie("accessToken", result.accessToken, accessCookieOptions)
      .cookie("refreshToken", result.refreshToken, refreshCookieOptions)
      .json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
        },
      });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    const result = await refreshAccessToken(refreshToken);

    res
      .cookie("accessToken", result.accessToken, accessCookieOptions)
      .cookie("refreshToken", result.refreshToken, refreshCookieOptions)
      .status(200)
      .json({
        success: true,
        message: "Token refreshed successfully",
      });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    await logoutUser(refreshToken);

    res
      .clearCookie("accessToken", {
        ...accessCookieOptions,
        maxAge: undefined,
      })
      .clearCookie("refreshToken", {
        ...refreshCookieOptions,
        maxAge: undefined,
      })
      .status(200)
      .json({
        success: true,
        message: "Logout successful",
      });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
