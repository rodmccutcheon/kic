# Agent Instructions

Instructions for AI coding assistants working in this repo.

---

## Project

Next.js 16 App Router, TypeScript, Prisma (SQLite), Tailwind CSS.

- API route handlers live in `src/app/api/` — keep them thin, delegate logic to `src/lib/`
- Business logic and database queries belong in `src/lib/`
- Shared types go in `src/types/`
- Use the Prisma client from `src/lib/db.ts` — never instantiate it directly elsewhere
- When creating a migration: `npx prisma migrate dev --name <descriptive-name>`

## Data contracts

Webhook payload shapes, API contracts, identity signal inventory, and edge cases are in `CONTRACTS.md`. Read that file before implementing any ingestion or resolution logic.
