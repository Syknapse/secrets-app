# Secrets sharing app — v2: real server-side persistence

## Context

The v1 MVP (`specs/spec.md`, `specs/01-scaffold` through `specs/05-routing-polish`)
was built under a 40-minute interview time box. It fakes "destroy after one
view" and "expires at" entirely in the browser: metadata lives inside the
encrypted URL fragment, and one-view enforcement is a `localStorage` flag that
anyone can clear or bypass by opening the link in a different browser. There is
no real authority deciding "has this secret been viewed yet" — the time box
made that an explicit, disclosed non-goal.

The interview is over. This spec upgrades the app to behave like a real
secrets-sharing tool: a server holds the one true copy of the secret and is the
single source of truth for whether it's still available — while remaining
**completely free to run** and preserving the app's best security property,
**zero-knowledge**: the server should never see the plaintext secret, only
ciphertext.

This app remains an exercise (not shipped to production), but should behave as
close to a professional implementation as reasonably possible.

## Stack decision

**Vercel Serverless Functions + Upstash Redis**, both free tiers, no credit
card required. Chosen over two alternatives after review:

- **Cloudflare Workers + KV** — also fully free and simpler (one vendor), but
  KV has no atomic "read and delete" primitive, leaving a small race window on
  one-view enforcement.
- **Supabase (Postgres + Edge Functions)** — free tier available, but a full
  relational schema is more machinery than this key-value problem needs.

Redis's `GETDEL` command — get a value and delete it, as one indivisible
operation — is the textbook-correct primitive for "destroy after one view,"
and Redis's native key TTL gives real, self-enforcing expiry for free. This is
how professional secret-sharing tools (e.g. onetimesecret.com) implement the
same feature.

## Security model

Preserved from v1, now actually enforced server-side instead of just disclosed
as a limitation:

- Encryption stays 100% client-side, reusing the AES-GCM approach in
  `src/lib/crypto.ts`.
- The encryption **key** never leaves the browser and never touches the
  server — it stays in the URL fragment (`#...`), which browsers never
  transmit over the network.
- Only **ciphertext** (opaque bytes) is sent to and stored by the server.
  Redis — and anyone with server/DB access — sees random-looking bytes, never
  the secret itself.
- Exception: `oneView` (boolean) is sent to the server in cleartext, because
  the server needs it to decide _how_ to serve a read (delete-after vs.
  leave-until-TTL). This is metadata about the secret, not the secret itself.

## Data model (Redis)

- **Key**: a random, unguessable ID (e.g. 20 bytes, base64url-encoded) —
  distinct from the encryption key. The two independent random values travel
  together in the link as `#<id>.<key>`.
- **Value**: JSON `{ iv, ciphertext, oneView }` (iv and ciphertext as
  base64url strings).
- **TTL**: set via Redis `EX` at write time.
  - "Expires at" secrets: TTL = seconds until that timestamp. Redis deletes
    the key automatically — no client-side expiry check needed anymore, this
    is correct by construction instead of best-effort.
  - "No restriction" / "one-view" secrets: still need a bounded TTL so storage
    doesn't grow unbounded on a free tier — default to a generous cap (e.g. 30
    days).

## API surface

Two endpoints, implemented as Vercel Serverless Functions under `api/`:

- **`POST /api/secrets`**
  Body: `{ iv: string, ciphertext: string, oneView: boolean,
ttlSeconds: number }`
  Effect: `SET <randomId> <value> EX <ttlSeconds>` in Redis.
  Response: `{ id: string }`

- **`GET /api/secrets/:id`** — the "consume" endpoint:
  - if the stored `oneView` is `true`: atomic `GETDEL` (read + delete in one
    step) — guarantees exactly one successful read even under concurrent
    requests for the same link.
  - if `false`: plain `GET` (left alone until its TTL expires naturally).
  - Not found (already consumed, expired, or invalid ID) → `404`.

**Accepted simplification**: the server cannot distinguish "expired" from
"already viewed" once a key is gone from Redis — both simply return `404`.
The view collapses v1's separate "Expired" / "Already viewed" screens into one
"This secret is no longer available" state.

## Client flow changes

- **`CreateSecret`**: encrypt locally (unchanged crypto), `POST` `{iv,
ciphertext, oneView, ttlSeconds}` to the API, receive `{id}`, build the link
  as `${origin}${pathname}#${id}.${key}`.
- **`ViewSecret`**: parse `id` and `key` out of the fragment, `GET
/api/secrets/:id`, decrypt the returned `{iv, ciphertext}` locally using the
  fragment's key. The `localStorage` one-view hack is removed entirely — the
  server is now the sole authority on availability.

## Areas touched

- New `api/secrets/index.ts` (POST) and `api/secrets/[id].ts` (GET) — using
  the `@upstash/redis` REST client (edge-runtime friendly, no TCP connection
  pooling to manage).
- `src/lib/crypto.ts` — AES-GCM encrypt/decrypt logic is reused; the
  base64url fragment-packing changes shape (`id.key` instead of
  `key.iv.ciphertext`) since `iv`/`ciphertext` now live server-side.
- New `src/lib/api.ts` — thin `fetch` wrapper for the two endpoints.
- `src/components/CreateSecret.tsx` / `src/components/ViewSecret.tsx` — swap
  local-only fragment encoding/decoding for the API calls above;
  `ViewSecret`'s state machine simplifies to drop the separate
  Expired/Already-viewed states in favor of one "gone" state.
- `.env.example` (new, committed) documenting `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`; `.env.local` stays gitignored.
- `README.md` — the "MVP non-goals" section updates: server-side enforcement
  is no longer a non-goal. Add a note about needing a free-tier Upstash
  account to run the app locally. Keep the remaining true non-goals (no auth,
  no rate limiting, no analytics).
- `package.json` — add `@upstash/redis` dependency, plus `vercel` as a dev
  dependency (or documented global install) for local `vercel dev`.

## Non-Goals

- No auth, no rate limiting, no analytics (unchanged from v1).
- No production deployment/hosting commitment — this remains a local/demo
  exercise.
- No distinguishing "expired" from "already viewed" in the UI (accepted
  simplification above).
- No automated test suite — verified manually against acceptance criteria
  below, consistent with v1.

## Acceptance criteria

- Creating a no-restriction secret and opening the link twice — including from
  a second browser/incognito window — reveals the secret both times.
- Creating a one-view secret and opening it once reveals the secret; opening
  the same link again (same or different browser) shows "no longer
  available." This must hold even when two opens happen back-to-back
  (verifies the atomic `GETDEL`, not just a client-side flag).
- Creating an expiry secret a few seconds in the future, waiting, then opening
  it shows "no longer available" — driven by Redis TTL, with no client-side
  timestamp check involved.
- Inspecting the stored value in Redis (via the Upstash web console) never
  shows readable plaintext of the secret.
- The encryption key never appears in any network request — only in the URL
  fragment, client-side.
- `vercel dev` boots the frontend and both API routes locally using a
  developer's own free Upstash credentials.

## Suggested task breakdown

1. **Infra setup** — create a free Upstash Redis database, install
   `@upstash/redis` and the `vercel` CLI, wire env vars, confirm `vercel dev`
   boots both the static frontend and a stub API route locally.
2. **Create-secret API** (`POST /api/secrets`) — accept `{iv, ciphertext,
oneView, ttlSeconds}`, write to Redis with TTL, return `{id}`.
3. **View-secret API** (`GET /api/secrets/:id`) — implement the
   `GETDEL`-vs-`GET` branch on `oneView`, return `404` when absent.
4. **Client API wrapper + crypto fragment rework** — `src/lib/api.ts`, and
   update `src/lib/crypto.ts`'s fragment packing to the new `id.key` shape.
5. **Wire `CreateSecret` to the new API** — replace local-only fragment
   generation with the create-then-link flow; verify the generated link
   round-trips through the real API.
6. **Wire `ViewSecret` to the new API** — replace `decryptFromFragment`'s
   local parsing and the `localStorage` one-view hack with the
   fetch-then-decrypt flow and the collapsed "gone" state.
7. **Docs update** — `.env.example`, README non-goals rewrite, brief
   instructions for running locally with a free Upstash account.
