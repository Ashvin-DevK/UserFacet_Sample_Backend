const AI_API_URL =
    `${process.env.AI_API_BASE_URL}/v1/chat/completions`;

const AI_TIMEOUT_MS = 30000;

export const generateBookSummary = async (book) => {
    if (
        !process.env.AI_API_BASE_URL ||
        !process.env.AI_API_TOKEN
    ) {
        const error = new Error(
            "AI service is not configured"
        );

        error.statusCode = 503;
        throw error;
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, AI_TIMEOUT_MS);

    try {
        const response = await fetch(
            AI_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.AI_API_TOKEN}`
                },

                signal: controller.signal,

                body: JSON.stringify({
                    model: "gpt-4o-mini",

                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert librarian. " +
                                "Generate concise and informative " +
                                "book summaries."
                        },
                        {
                            role: "user",
                            content: `
Summarize the following book in approximately
150-200 words.

Title:
${book.title}

Authors:
${book.authors.join(", ")}

Categories:
${book.categories.join(", ")}

Description:
${book.description}

Focus on:
1. What the book is about
2. Its major themes or concepts
3. Who would benefit from reading it

Do not invent information that is not supported
by the provided information.
                            `.trim()
                        }
                    ],

                    max_tokens: 300,
                    temperature: 0.3
                })
            }
        );

        const contentType =
            response.headers.get("content-type") || "";

        let data = null;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();

            data = {
                error: {
                    message: text
                }
            };
        }

        if (!response.ok) {
            const error = new Error(
                data?.error?.message ||
                "AI service request failed"
            );

            if (
                response.status === 429
            ) {
                error.statusCode = 503;
                error.code = "AI_RATE_LIMITED";
            } else if (
                response.status >= 500
            ) {
                error.statusCode = 503;
                error.code = "AI_UNAVAILABLE";
            } else {
                error.statusCode = response.status;
                error.code = "AI_REQUEST_FAILED";
            }

            throw error;
        }

        const summary =
            data?.choices?.[0]?.message?.content;

        if (
            typeof summary !== "string" ||
            !summary.trim()
        ) {
            const error = new Error(
                "AI returned an empty or invalid summary"
            );

            error.statusCode = 502;
            error.code = "AI_INVALID_RESPONSE";

            throw error;
        }

        return summary.trim();

    } catch (error) {

        if (error.name === "AbortError") {
            const timeoutError = new Error(
                "AI service request timed out"
            );

            timeoutError.statusCode = 504;
            timeoutError.code = "AI_TIMEOUT";

            throw timeoutError;
        }

        if (
            error.code === "AI_RATE_LIMITED" ||
            error.code === "AI_UNAVAILABLE" ||
            error.code === "AI_REQUEST_FAILED" ||
            error.code === "AI_INVALID_RESPONSE"
        ) {
            throw error;
        }

        const serviceError = new Error(
            "AI service is currently unavailable"
        );

        serviceError.statusCode = 503;
        serviceError.code = "AI_UNAVAILABLE";

        throw serviceError;

    } finally {
        clearTimeout(timeout);
    }
};