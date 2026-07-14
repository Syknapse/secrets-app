# Feature: Client-Side Crypto Utility

## Objective

Provide a pure, isolated module that encrypts a secret (plus its destroy-rule
metadata) into a URL-safe string, and decrypts that string back, entirely
client-side using the Web Crypto API. This is the foundation both the create-view
and view-secret features depend on.

## Scope

- File: `src/lib/crypto.ts`.
- `encryptSecret(text: string, meta: { oneView: boolean; expiresAt: number | null }): Promise<string>`
  - Generates a random AES-GCM key + IV via `crypto.subtle`.
  - Encrypts `JSON.stringify({ text, meta })`.
  - Returns a single base64url-encoded fragment string that embeds ciphertext, IV,
    and key (e.g. `key.iv.ciphertext` joined and base64url-encoded, or packed into
    one buffer) — the fragment must be self-sufficient to decrypt with no server
    round-trip.
- `decryptFromFragment(fragment: string): Promise<{ text: string; meta: { oneView: boolean; expiresAt: number | null } } | null>`
  - Parses and decrypts the fragment.
  - Returns `null` (not a throw) on any malformed/invalid input, so callers can
    show a friendly "invalid link" state.

## Non-Goals

- No server-side storage or transmission of keys/ciphertext.
- No support for editing/updating a secret after creation.
- No automated test suite (manual verification only, per time-boxed MVP).

## Definition of Done

- `encryptSecret` and `decryptFromFragment` are implemented, exported, and
  type-checked with no `any` escape hatches.
- Round-tripping `encryptSecret` → `decryptFromFragment` returns the original text
  and metadata unchanged.
- Passing garbage/truncated input to `decryptFromFragment` returns `null` rather
  than throwing.
- The encrypted fragment contains no plaintext of the original secret (visually
  inspectable as opaque base64).

## Verification

1. In a scratch script or browser console (via the running dev app), call
   `encryptSecret("hello world", { oneView: true, expiresAt: null })` and confirm
   it returns a non-empty string with no readable "hello world" substring.
2. Feed that string into `decryptFromFragment` and confirm it returns
   `{ text: "hello world", meta: { oneView: true, expiresAt: null } }`.
3. Call `decryptFromFragment("not-a-valid-fragment")` and confirm it returns `null`
   without throwing an unhandled exception.
