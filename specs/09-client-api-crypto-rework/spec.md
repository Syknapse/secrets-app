# Feature: Client API Wrapper + Crypto Fragment Rework

## Objective

Give the frontend a typed way to call the two new API endpoints, and adapt
`src/lib/crypto.ts`'s fragment format now that `iv`/`ciphertext` live
server-side instead of in the URL.

## Scope

- New file: `src/lib/api.ts`:
  - `createSecret(iv: string, ciphertext: string, oneView: boolean,
    ttlSeconds: number): Promise<{ id: string }>` — `POST`s to
    `/api/secrets`, throws on non-2xx.
  - `fetchSecret(id: string): Promise<{ iv: string; ciphertext: string } |
    null>` — `GET`s `/api/secrets/:id`, returns `null` on `404`, throws on
    other non-2xx statuses.
- Modify `src/lib/crypto.ts`:
  - `encryptSecret` no longer returns a single packed `key.iv.ciphertext`
    fragment. Split into pieces the caller can use independently: return
    something like `{ key: string, iv: string, ciphertext: string }` (all
    base64url), where `key` is what goes in the URL fragment and
    `iv`/`ciphertext` are what gets `POST`ed to the API.
  - `decryptFromFragment` is replaced by a lower-level `decrypt(key: string,
    iv: string, ciphertext: string): Promise<string | null>` that takes the
    key from the fragment and the `iv`/`ciphertext` fetched from the API,
    returning the decrypted secret text or `null` on any failure (same
    graceful-null contract as before).
  - The secret's `meta` (`oneView`/`expiresAt`) is no longer packed into the
    encrypted payload — `oneView` is now a plain field sent to the API
    directly (see specs/07), and `expiresAt` becomes a `ttlSeconds` value
    computed by the caller, not stored in the ciphertext at all.

## Non-Goals

- No changes to `CreateSecret.tsx` / `ViewSecret.tsx` yet (specs/10 and
  specs/11) — this feature only prepares the utilities they'll use.
- No retry/offline handling in `api.ts` — a straightforward `fetch` wrapper is
  sufficient.

## Definition of Done

- `src/lib/api.ts` exports `createSecret` and `fetchSecret`, both
  type-checked with no `any`.
- `src/lib/crypto.ts`'s `encryptSecret`/`decrypt` round-trip: encrypting text
  and decrypting with the same `key`/`iv`/`ciphertext` returns the original
  text.
- `decrypt` returns `null` (not a throw) for a wrong key or corrupted
  ciphertext.
- No remaining references to the old `decryptFromFragment` or the old packed
  `key.iv.ciphertext` fragment format anywhere in `src/lib/`.

## Verification

1. Type-check the project (`vercel dev` or `tsc -b`) and confirm no errors.
2. In a scratch script (e.g. via `tsx`, matching the approach used to verify
   specs/02's crypto utility), call `encryptSecret("hello", ...)`, then
   `decrypt(key, iv, ciphertext)` and confirm it returns `"hello"`.
3. Call `decrypt` with a deliberately wrong `key` and confirm it returns
   `null` rather than throwing.
4. With `vercel dev` running (specs/06) and the create endpoint live
   (specs/07), call `createSecret(...)` from a scratch script against the
   running dev server and confirm it returns a real `{ id }`; call
   `fetchSecret(id)` and confirm it returns the matching `{iv, ciphertext}`.
