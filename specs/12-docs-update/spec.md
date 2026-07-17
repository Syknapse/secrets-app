# Feature: Docs Update

## Objective

Bring `README.md` and environment documentation in line with the new
server-backed reality, so anyone (including future-you) can clone the repo
and run it correctly.

## Scope

- `README.md`:
  - Update the architecture description: no longer "fully client-only" — now
    a static frontend + Vercel serverless API + Upstash Redis, with
    encryption still happening entirely client-side (zero-knowledge property
    preserved and worth calling out explicitly as the interesting part).
  - Update "Getting started": `vercel dev` instead of `npm run dev` as the
    primary local run command (or document both, noting `npm run dev` alone
    won't serve the API routes).
  - Add a short "Environment setup" section: create a free Upstash Redis
    database, copy `.env.example` to `.env.local`, fill in
    `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
  - Rewrite the "MVP non-goals" section:
    - Remove "No server-side enforcement of one-view/expiry" — this is no
      longer true.
    - Add the new accepted simplification: "expired" and "already viewed"
      are not distinguished in the UI (both show as unavailable).
    - Keep: no auth, no rate limiting, no analytics, no automated test suite,
      no production deployment commitment.
- Confirm `.env.example` (created in specs/06) is accurate and complete.

## Non-Goals

- No changes to app code or behavior — documentation only.
- No deployment guide beyond local `vercel dev` usage (deploying to
  production is explicitly out of scope for this exercise).

## Definition of Done

- `README.md` accurately describes the v2 architecture, setup steps, and
  non-goals — no stale references to the v1 fully-client-only design.
- A developer with no prior context could follow the README to get the app
  running locally end-to-end (Upstash account, env vars, `vercel dev`).
- `markdownlint` passes on `README.md` with no errors.

## Verification

1. Read `README.md` top to bottom and confirm every instruction matches the
   actual current behavior of the app (spot-check against specs/06–specs/11).
2. Follow the README's setup steps from a clean checkout (or as close to one
   as practical) and confirm the app runs.
3. Run `npx markdownlint README.md` and confirm no errors.
