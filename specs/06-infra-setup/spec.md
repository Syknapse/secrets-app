# Feature: Infra Setup (Upstash Redis + Vercel)

## Objective

Stand up the free-tier backend infrastructure — an Upstash Redis database and
local Vercel tooling — so subsequent features have somewhere to persist
secrets. No app logic changes in this feature; it's plumbing only.

## Scope

- Create a free Upstash Redis database (no credit card required) via the
  Upstash console.
- Add `@upstash/redis` as a runtime dependency.
- Add the `vercel` CLI (as a dev dependency, or document a global install) for
  running `vercel dev` locally.
- Create `api/` directory at repo root (Vercel's convention for serverless
  functions) with a single stub route, e.g. `api/health.ts`, returning
  `{ ok: true }`, to prove the function runtime works end-to-end before real
  endpoints are built.
- Create `.env.example` documenting the two required variables:
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Create a local `.env.local` (gitignored — confirm `.gitignore` already
  covers `.env*.local`, add the entry if missing) populated with real
  credentials from the developer's own Upstash database.

## Non-Goals

- No real secret-storage endpoints yet (that's specs/07 and specs/08).
- No production deployment — local `vercel dev` only.
- No changes to existing frontend components.

## Definition of Done

- An Upstash Redis database exists and its REST URL/token are available.
- `@upstash/redis` and the Vercel CLI are installed.
- `.env.example` exists and is committed; `.env.local` exists locally and is
  gitignored.
- `api/health.ts` exists and returns a JSON success response.
- `vercel dev` starts without errors and serves both the static frontend and
  the `/api/health` route.

## Verification

1. Run `vercel dev` (linking the project to Vercel on first run if prompted).
2. Confirm the frontend loads at the printed local URL, same as `npm run dev`
   did previously.
3. `curl http://localhost:3000/api/health` (or the port `vercel dev` prints)
   and confirm it returns `{ "ok": true }`.
4. Confirm `git status` does not show `.env.local` as untracked/stageable
   (i.e. it's properly gitignored).
5. Confirm `.env.example` is present and lists both required variable names
   with placeholder values (no real secrets committed).
