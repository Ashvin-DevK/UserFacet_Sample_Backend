import { z } from "zod";

export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(50),

    email: z
        .string()
        .trim()
        .email()
        .toLowerCase(),

    password: z
        .string()
        .min(8)
        .max(100)
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
            "Password must contain uppercase, lowercase and a number"
        )
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email()
        .toLowerCase(),

    password: z
        .string()
        .min(1)
        .max(100)
});