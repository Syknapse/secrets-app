# Feature: View-Secret API (`GET /api/secrets/:id`)

## Objective

Provide the "consume" endpoint: serve a stored secret's ciphertext, atomically
deleting it if it was created as one-view, so the server is the single source
of truth for availability instead of a client-side flag.

## Scope

- File: `api/secrets/[id].ts` (Vercel serverless function, `GET` only).
- Looks up `id` in Redis:
  - First determine whether the stored entry has `oneView: true` — this
    requires either a single atomic operation that both reads and
    conditionally deletes (preferred), or a read of the value's `oneView`
    field followed by an immediate `GETDEL`/`GET` — see Definition of Done for
    the concurrency guarantee that must hold regardless of implementation
    approach.
  - If `oneView` is `true`: perform `GETDEL <id>` — atomically returns the
    value and deletes it in one round-trip. This is the mechanism that makes
    one-time-view actually correct (no race window).
  - If `oneView` is `false`: perform a plain `GET <id>` (left alone until its
    TTL expires naturally).
- Not found (bad ID, already consumed, or naturally expired) → `404` with a
  generic body, e.g. `{ error: "not_found" }`. Do not attempt to distinguish
  "expired" from "already viewed" — Redis doesn't retain that information
  once a key is gone, per specs/spec-v2-persistence.md's accepted
  simplification.
- Success → `200` with `{ iv: string, ciphertext: string }` (the `oneView`
  flag is not needed by the client at this point and can be omitted from the
  response).

## Non-Goals

- No write/creation logic (that's specs/07).
- No distinguishing expired vs. already-viewed in the response.
- No frontend changes — this endpoint is tested directly in this feature.

## Definition of Done

- `GET /api/secrets/:id` for an existing `oneView: false` entry returns `200`
  with the correct `{iv, ciphertext}`, and the entry still exists in Redis
  afterward (repeatable reads until TTL expiry).
- `GET /api/secrets/:id` for an existing `oneView: true` entry returns `200`
  with the correct `{iv, ciphertext}` on the first call, and a second call to
  the same `id` returns `404`.
- Two concurrent `GET` requests for the same one-view `id` (fired
  back-to-back) result in exactly one `200` and one `404` — never two `200`s.
  This is the core correctness property `GETDEL`'s atomicity provides over the
  v1 `localStorage` approach.
- `GET /api/secrets/:id` for a nonexistent or expired `id` returns `404`.

## Verification

1. Using an entry created via specs/07 with `oneView: false`, `GET` it twice
   and confirm both return `200` with matching `{iv, ciphertext}`.
2. Create a new entry with `oneView: true` via `POST /api/secrets`, then `GET`
   it once — confirm `200` — then `GET` it again — confirm `404`.
3. Create another `oneView: true` entry, then fire two `GET` requests
   concurrently (e.g. two `curl` calls backgrounded in the same shell command)
   — confirm exactly one `200` and one `404` in the combined output.
4. `GET /api/secrets/does-not-exist` and confirm `404`.
5. Create an entry with a 2-second `ttlSeconds`, wait 3 seconds, then `GET` it
   and confirm `404`.
