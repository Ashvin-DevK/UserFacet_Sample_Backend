import { z } from "zod";

export const createBookSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1)
            .max(200),

        description: z
            .string()
            .trim()
            .min(10)
            .max(5000),

        isbn: z
            .string()
            .trim()
            .transform(value => value.replace(/[-\s]/g, ""))
            .refine(
                value => /^(?:\d{10}|\d{13})$/.test(value),
                "ISBN must contain 10 or 13 digits"
            ),

        authors: z
            .array(
                z
                    .string()
                    .trim()
                    .min(1)
                    .max(150)
            )
            .min(1)
            .max(20),

        categories: z
            .array(
                z
                    .string()
                    .trim()
                    .min(1)
                    .max(100)
            )
            .min(1)
            .max(20),

        publisher: z
            .string()
            .trim()
            .max(200)
            .optional(),

        publishedYear: z
            .number()
            .int()
            .min(0)
            .max(new Date().getFullYear())
            .optional(),

        language: z
            .string()
            .trim()
            .min(1)
            .max(50)
            .optional(),

        coverImage: z
            .string()
            .url()
            .optional(),

        totalCopies: z
            .number()
            .int()
            .min(1)
            .max(100000)
    })
    .strict();

    export const getBooksQuerySchema = z.object({
    search: z
        .string()
        .trim()
        .max(100)
        .optional(),

    category: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

    author: z
        .string()
        .trim()
        .min(1)
        .max(150)
        .optional(),

    page: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .refine(
            value => value >= 1,
            "Page must be at least 1"
        )
        .default("1"),

    limit: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .refine(
            value => value >= 1 && value <= 50,
            "Limit must be between 1 and 50"
        )
        .default("10")
})
.strict();

export const updateBookSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .optional(),

    description: z
        .string()
        .trim()
        .min(10)
        .max(5000)
        .optional(),

    isbn: z
        .string()
        .trim()
        .min(10)
        .max(20)
        .optional(),

    authors: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional(),

    categories: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional(),

    publisher: z
        .string()
        .trim()
        .optional(),

    publishedYear: z
        .number()
        .int()
        .min(0)
        .max(new Date().getFullYear())
        .optional(),

    language: z
        .string()
        .trim()
        .optional(),

    coverImage: z
        .string()
        .url()
        .nullable()
        .optional(),

    totalCopies: z
        .number()
        .int()
        .min(1)
        .optional()
}).strict();