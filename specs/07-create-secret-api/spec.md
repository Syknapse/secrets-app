# Feature: Create-Secret API (`POST /api/secrets`)

## Objective

Provide a serverless endpoint that accepts an already-encrypted secret and
persists it to Redis with the correct destroy-rule semantics, returning an ID
the client can build a link around.

## Scope

- File: `api/secrets/index.ts` (Vercel serverless function, `POST` only).
- Uses `@upstash/redis` client, configured from `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` (per specs/06-infra-setup).
- Request body: `{ iv: string, ciphertext: string, oneView: boolean,
  ttlSeconds: number }`. All fields required; `iv`/`ciphertext` are
  base64url strings, `ttlSeconds` a positive integer.
- Validates the body — reject with `400` if any field is missing or the wrong
  type, or if `ttlSeconds` is not a positive integer, or exceeds a hard cap
  (e.g. 30 days in seconds) to bound storage growth on the free tier.
- Generates a random, unguessable ID (e.g. 20 random bytes, base64url-encoded)
  — independent from the client's encryption key, which this endpoint never
  sees.
- Writes to Redis: `SET <id> <JSON of {iv, ciphertext, oneView}> EX
  <ttlSeconds>`.
- Response: `201` with `{ id: string }` on success.

## Non-Goals

- No reading/consuming logic (that's specs/08).
- No rate limiting or abuse prevention.
- No changes to frontend components — this endpoint is tested directly, not
  through the UI, in this feature.

## Definition of Done

- `POST /api/secrets` with a valid body returns `201` and a JSON `{ id }`
  where `id` is a non-empty, URL-safe string.
- The corresponding Redis key exists immediately after the call, with a TTL
  approximately equal to the requested `ttlSeconds` (inspectable via Upstash
  console or a follow-up `GET`/`TTL` call).
- The stored value's `ciphertext` field matches what was sent — no server-side
  transformation of the opaque ciphertext bytes.
- Malformed requests (missing field, wrong type, non-positive or excessive
  `ttlSeconds`) return `400` with no Redis write performed.
- The server-side handler never logs or persists anything resembling a
  decrypted secret — only the opaque `iv`/`ciphertext` strings it received.

## Verification

1. With `vercel dev` running (specs/06), send:
   `curl -X POST http://localhost:3000/api/secrets -H "Content-Type:
   application/json" -d '{"iv":"AAAA","ciphertext":"BBBB","oneView":false,
   "ttlSeconds":60}'`
   and confirm a `201` with `{ "id": "..." }`.
2. Inspect the Upstash console (or use the Redis CLI via `@upstash/redis`) to
   confirm the key exists with the submitted value and a TTL near 60 seconds.
3. Send a request missing `ciphertext` and confirm `400`.
4. Send a request with `ttlSeconds: -5` and confirm `400`.
5. Send a request with `ttlSeconds` far beyond the cap (e.g. 10x the 30-day
   max) and confirm `400`.
