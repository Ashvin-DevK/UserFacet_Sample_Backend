# 📚 E-Library — Backend API

A production-style REST API for a digital library / book-borrowing system, built with **Node.js**, **Express 5**, and **MongoDB (Mongoose)**. It handles user authentication, book catalog management, borrowing & returns, a reservation queue for out-of-stock books, automated overdue-fine calculation, and AI-generated book summaries.

This service is the backend only — it exposes a JSON REST API intended to be consumed by a separate frontend (React/Vite, based on the configured CORS origin).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Domain Logic & Business Rules](#domain-logic--business-rules)
- [Background Jobs](#background-jobs)
- [Security](#security)
- [Error Handling](#error-handling)
- [Known Limitations](#known-limitations)

---

## Tech Stack

| Layer              | Technology                                   |
| ------------------ | --------------------------------------------- |
| Runtime             | Node.js (ES Modules)                         |
| Framework           | Express 5                                    |
| Database            | MongoDB with Mongoose ODM                    |
| Auth                | JWT (access token) + rotating opaque refresh tokens |
| Validation          | Zod                                           |
| Password hashing    | bcryptjs                                      |
| Scheduled jobs      | node-cron                                     |
| Security middleware | Helmet, CORS, express-rate-limit, custom CSRF |
| Email (planned)     | Nodemailer                                    |
| AI integration      | External LLM chat-completions endpoint (OpenAI-compatible) |
| Dev tooling         | ESLint, Prettier, Nodemon                     |

---

## Core Features

- **Authentication** — Register/login with hashed passwords, short-lived JWT access tokens delivered via httpOnly cookies, and long-lived rotating refresh tokens with reuse detection (token-family revocation on replay).
- **Account protection** — Automatic account lockout after repeated failed login attempts.
- **Role-based access control** — `user` and `admin` roles enforced via middleware.
- **Book catalog** — CRUD for books with full-text search (title/description/authors/categories), filtering by category/author, and pagination.
- **AI-generated summaries** — On-demand book summaries generated via an external LLM API, cached on the book document, with a locking mechanism to prevent duplicate concurrent generation requests for the same book.
- **Borrowing system** — Borrow/return flow with copy-availability tracking, a per-user active-borrow cap, and duplicate-borrow prevention — all wrapped in MongoDB transactions for atomicity.
- **Reservation queue** — FIFO waitlist for books with zero available copies; when a copy is returned, the next person in line is automatically promoted and given a time-limited hold.
- **Overdue fines** — Automatically calculated per day overdue, recalculated on return.
- **Admin analytics** — Aggregate dashboard stats (users, books, borrows, reservations, total fines).
- **Rate limiting** — General API rate limiting plus a stricter limiter on the AI-summary endpoint (which calls a paid external service).

---

## Architecture

The app follows a fairly standard layered structure:

```
Route → Middleware (auth/role/rate-limit) → Controller → Zod Validator → Service (business logic) → Mongoose Model → MongoDB
```

- **Routes** define HTTP endpoints and wire up middleware.
- **Controllers** are thin — they validate input via Zod, call a service, and shape the HTTP response.
- **Services** contain all business logic (transactions, invariants, external API calls).
- **Models** define the Mongoose schemas and indexes.
- **Jobs** run independently on cron schedules (not triggered by HTTP requests).

---

## Project Structure

```
server/
├── jobs/
│   ├── overdue.job.js          # Hourly: marks borrows overdue + calculates fines
│   └── reservation.job.js      # Every 5 min: expires stale "ready" reservations
├── src/
│   ├── app.js                  # Express app: middleware + route mounting
│   ├── server.js               # Entry point: connects DB, starts jobs, starts HTTP server
│   ├── config/
│   │   ├── db.js               # Mongoose connection (custom DNS resolvers for Atlas SRV)
│   │   └── cookie.config.js    # httpOnly cookie options for access/refresh tokens
│   ├── controllers/            # HTTP request handlers
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT verification (reads accessToken cookie)
│   │   ├── role.middleware.js       # Role-based authorization guard
│   │   ├── csrf.middleware.js       # Double-submit-cookie CSRF check
│   │   ├── rateLimit.middleware.js  # General + AI-specific rate limiters
│   │   └── error.middleware.js      # Centralized error formatter (incl. Zod errors)
│   ├── models/                 # Mongoose schemas (User, Book, Borrow, Reservation, RefreshToken, ReservationCounter)
│   ├── routes/                 # Express routers per resource
│   ├── services/                # Business logic
│   │   ├── auth.service.js
│   │   ├── book.service.js
│   │   ├── borrow.service.js
│   │   ├── reservation.service.js
│   │   ├── admin-analytics.service.js
│   │   └── ai.service.js
│   └── validators/             # Zod schemas for request validation
├── .env.example                 # Environment variable template (see below)
├── .gitignore
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (uses native `fetch`)
- A MongoDB instance (local or MongoDB Atlas)
- An OpenAI-compatible chat-completions API endpoint (optional — only required for the AI book-summary feature)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in real values
cp .env.example .env

# 3. Run in development (auto-restarts via nodemon)
npm run dev

# — or run in production mode —
npm start
```

The API will be available at `http://localhost:<PORT>/api/v1`, e.g.:

```
GET http://localhost:5000/api/v1/health
```

---

## Environment Variables

The app loads config from a `.env` file at the project root (via `dotenv`). **`.env` is git-ignored — never commit real credentials.** Use `.env.example` as the template and fill in your own values locally / in your deployment platform's secret manager.

| Variable          | Required | Description                                                                 |
| ------------------ | :------: | ----------------------------------------------------------------------------- |
| `PORT`              | No       | Port the HTTP server listens on. Defaults to `5000`.                         |
| `NODE_ENV`          | No       | `development` or `production`. Controls cookie `secure`/`sameSite` behavior. |
| `MONGO_URI`         | **Yes**  | Full MongoDB connection string (e.g. an Atlas SRV URI).                      |
| `JWT_SECRET`        | **Yes**  | Secret used to sign/verify JWT access tokens. Use a long, random string.     |
| `FRONTEND_URL`      | **Yes**  | Origin allowed by CORS (must match your frontend's URL exactly, credentials-enabled). |
| `AI_API_BASE_URL`   | No*      | Base URL of the OpenAI-compatible chat-completions provider used for AI book summaries. |
| `AI_API_TOKEN`      | No*      | Bearer token/API key for the AI provider.                                    |

\* The AI summary endpoint (`GET /api/v1/books/:id/summary`) returns a `503` if these are not configured — everything else works without them.

### `.env.example`

```env
# --- Server ---
PORT=5000
NODE_ENV=development

# --- Database ---
# MongoDB connection string (local or Atlas SRV URI)
MONGO_URI="mongodb+srv://<username>:<password>@<cluster-url>/<db-name>"

# --- Auth ---
# Long, random secret used to sign JWT access tokens
JWT_SECRET="replace-with-a-long-random-secret"

# --- CORS ---
# Must match the frontend origin exactly (credentials: true requires an explicit origin, not *)
FRONTEND_URL="http://localhost:5173"

# --- AI Book Summaries (optional) ---
# Any OpenAI-compatible chat-completions endpoint
AI_API_BASE_URL="https://api.openai.com"
AI_API_TOKEN="sk-your-api-key"
```

> ⚠️ **Security note:** This project's working `.env` currently contains a live MongoDB Atlas username/password and an AI API token. Because `.env` is already excluded via `.gitignore`, those values were **intentionally not reproduced above**. If this database or API token was ever pushed to a public repo, pasted into a chat, or exposed in a screenshot, rotate it immediately (change the Atlas DB user's password and regenerate the AI API key).

---

## API Reference

Base path: `/api/v1`

### Health

| Method | Path      | Auth | Description         |
| ------ | --------- | ---- | -------------------- |
| GET    | `/health` | —    | Basic liveness check |

### Auth (`/auth`)

| Method | Path        | Auth        | Description                                                       |
| ------ | ----------- | ----------- | ------------------------------------------------------------------- |
| POST   | `/register` | —           | Create a new user account (`name`, `email`, `password`).           |
| POST   | `/login`    | —           | Log in; sets `accessToken` + `refreshToken` httpOnly cookies.       |
| POST   | `/refresh`  | Refresh cookie | Rotates the refresh token and issues a new access token.        |
| POST   | `/logout`   | Refresh cookie | Revokes the entire refresh-token family for the session.        |
| GET    | `/me`       | Access token | Returns the currently authenticated user's profile.               |

### Books (`/books`)

| Method | Path            | Auth        | Description                                                            |
| ------ | ---------------- | ----------- | -------------------------------------------------------------------------- |
| GET    | `/`               | —           | List/search books. Supports `search`, `category`, `author`, `page`, `limit`. |
| GET    | `/:id`            | —           | Get a single active book.                                                |
| GET    | `/:id/summary`    | — (AI-limited) | Get or generate an AI summary for a book. Rate-limited (10/hour).       |
| POST   | `/`               | Admin       | Create a book.                                                           |
| PATCH  | `/:id`            | Admin       | Update a book. Clears cached AI summary if title/description/authors/categories change. |
| DELETE | `/:id`            | Admin       | Soft-delete (deactivate) a book. Blocked if it has active borrows/reservations. |

### Borrowing (`/borrow`)

| Method | Path                | Auth  | Description                                     |
| ------ | -------------------- | ----- | -------------------------------------------------- |
| GET    | `/history`            | User  | Full borrow history for the current user.        |
| GET    | `/my`                 | User  | Same as above (alternate endpoint).               |
| POST   | `/:bookId`            | User  | Borrow a book (decrements available copies).      |
| POST   | `/:borrowId/return`   | User  | Return a borrowed book (calculates fine if overdue, promotes next reservation). |

### Reservations (`/reservations`)

| Method | Path                 | Auth | Description                                              |
| ------ | --------------------- | ---- | ------------------------------------------------------------ |
| POST   | `/:bookId`             | User | Join the waitlist for a book with zero available copies.    |
| GET    | `/mine`                | User | List the current user's reservations.                      |
| DELETE | `/:reservationId`      | User | Cancel an active (`waiting`/`ready`) reservation.            |

### Admin Analytics (`/admin/analytics`)

| Method | Path | Auth  | Description                                                                 |
| ------ | ---- | ----- | ------------------------------------------------------------------------------ |
| GET    | `/`   | Admin | Aggregate counts: users, books, borrows (active/overdue/returned), reservations, total fines collected. |

### Response shape

All endpoints return a consistent envelope:

```json
{ "success": true, "message": "...", "data": { } }
```

Errors follow the same shape with `"success": false` (see [Error Handling](#error-handling)).

---

## Domain Logic & Business Rules

These constants live in the relevant service files and represent the core policy of the library:

| Rule                              | Value                          | Where                        |
| ----------------------------------- | ------------------------------- | ------------------------------- |
| Borrow duration                     | 14 days                         | `borrow.service.js`            |
| Max simultaneous active borrows     | 5 per user                      | `borrow.service.js`            |
| Fine per overdue day                | 10 (currency units)             | `borrow.service.js`, `overdue.job.js` |
| Reservation hold window             | 48 hours after a copy becomes available | `reservation.service.js` |
| Failed login lockout threshold      | 10 attempts                     | `auth.service.js`              |
| Account lock duration               | 15 minutes                      | `auth.service.js`              |
| Access token lifetime               | 15 minutes                      | `auth.service.js`              |
| Refresh token lifetime              | 7 days                          | `auth.service.js`              |
| AI summary rate limit               | 10 requests / hour (per IP)     | `rateLimit.middleware.js`      |
| General API rate limit              | 100 requests / 15 min (per IP)  | `rateLimit.middleware.js`      |

**Borrow flow invariants** (enforced inside a MongoDB transaction so they can't race):
1. User must exist and be active.
2. Book must exist and be active.
3. User cannot borrow the same book twice while an existing borrow is active.
4. If a book has a "ready" reservation (someone at the front of the waitlist with an active hold), only that user may borrow it.
5. User cannot exceed the max active-borrow cap.
6. A copy must actually be available (`availableCopies > 0`), decremented atomically.

**Reservation flow:**
- You can only reserve a book that currently has **zero** available copies (otherwise you're told to just borrow it).
- Reservations are FIFO, ordered by a per-book auto-incrementing `position` counter (`ReservationCounter` model), so position numbers stay correct even under concurrent reservation requests.
- When a copy is returned, `promoteNextReservation` bumps the earliest `waiting` reservation to `ready` and starts a 48-hour hold.
- A cron job (`reservation.job.js`) sweeps every 5 minutes for holds that expired without being claimed, marks them `expired`, and promotes the next person in line.

**AI summary generation:**
- Summaries are cached on the `Book` document (`aiSummary`, `aiSummaryStatus`).
- A lightweight optimistic-locking pattern (`aiSummaryStatus: "generating"` + timestamp) prevents two concurrent requests from both calling the paid AI API for the same book; a second caller polls until the first finishes (or the lock goes stale after 2 minutes and is retried).

---

## Background Jobs

Started once at boot in `server.js`, independent of any HTTP request:

| Job                | Schedule           | Responsibility                                                              |
| -------------------- | ------------------- | --------------------------------------------------------------------------- |
| `overdue.job.js`      | Every hour (`0 * * * *`) | Finds `borrowed` records past their `dueAt`, flips status to `overdue`, and calculates the fine owed. |
| `reservation.job.js`  | Every 5 minutes (`*/5 * * * *`) | Expires `ready` reservations whose 48-hour hold has lapsed and promotes the next person in the queue. |

---

## Security

- **Helmet** — sets standard hardening HTTP headers.
- **CORS** — locked to a single configured `FRONTEND_URL` with credentials enabled (not a wildcard).
- **httpOnly, sameSite cookies** for both access and refresh tokens — not accessible to client-side JS, mitigating XSS token theft.
- **CSRF protection** — double-submit cookie pattern (`csrfToken` cookie vs. `x-csrf-token` header) using a timing-safe comparison, available as middleware for state-changing routes.
- **Password hashing** — bcrypt with 12 salt rounds.
- **Refresh token rotation + reuse detection** — refresh tokens are stored server-side only as SHA-256 hashes; each use issues a new token and revokes the old one. If a *revoked* token is presented again (a strong signal of theft/replay), the entire token family is invalidated, forcing re-authentication.
- **Account lockout** — brute-force protection via failed-attempt counting and a temporary lock.
- **Rate limiting** — a general limiter on all routes plus a much stricter limiter on the AI endpoint to control cost/abuse of the paid external API.
- **Zod validation** on all mutating endpoints — malformed input is rejected with a structured `400` before it reaches business logic.

---

## Error Handling

All errors flow through a single `errorHandler` middleware (`src/middleware/error.middleware.js`):

- **Zod validation errors** → `400` with a per-field breakdown:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [{ "field": "email", "message": "Invalid email" }]
  }
  ```
- **Domain errors** (thrown by services with a `.statusCode` attached, e.g. `404`, `409`, `423`) → passed through with that status code and message.
- **Unhandled errors** → `500` with a generic message (full error is logged server-side via `console.error`).

---

## Known Limitations

Worth being upfront about, since a few of these would come up in review:

- **No automated test suite** — no Jest/Mocha/Supertest setup is present yet.
- **No API documentation tooling** — no Swagger/OpenAPI spec; this README is the source of truth for now.
- **Nodemailer is installed but unused** — email verification/notifications (e.g. "your reservation is ready", "your book is overdue") are not yet wired up.
- **`createReservation` references an undeclared `session` variable** in `reservation.service.js` (the reservation-counter update passes `session` to `findOneAndUpdate`, but no Mongoose session is ever created in that function) — this will throw a `ReferenceError` the first time that code path runs. Fix by either removing the `session` option or wrapping the whole reservation flow in a transaction the way `borrow.service.js` does.
- **No image upload handling** — `coverImage` is a plain URL field; there's no file upload/storage integration.
- **No pagination on `/borrow/history`, `/borrow/my`, or `/reservations/mine`** — these return the user's full history in one response.
- **AI summary provider is hardcoded to `gpt-4o-mini`** in the request payload, which assumes an OpenAI-compatible provider.
