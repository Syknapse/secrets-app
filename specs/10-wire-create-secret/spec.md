# Feature: Wire `CreateSecret` to the New API

## Objective

Replace `CreateSecret`'s local-only fragment generation with the real
create-then-link flow: encrypt locally, persist ciphertext server-side via the
API, and build a link whose fragment carries only the ID and encryption key.

## Scope

- File: `src/components/CreateSecret.tsx`.
- On "Generate Link":
  1. Call the reworked `encryptSecret` (specs/09) to get `{key, iv,
     ciphertext}`.
  2. Compute `ttlSeconds` from the chosen destroy rule:
     - "Expires at": seconds between now and the chosen timestamp (reject/clamp
       if the timestamp is in the past — keep existing datetime-local input).
     - "No restriction" or "one-view": a default bounded TTL (e.g. 30 days,
       matching the cap the API enforces per specs/07).
  3. Call `createSecret(iv, ciphertext, oneView, ttlSeconds)` (specs/09) to
     get `{id}`.
  4. Build the link as `${location.origin}${location.pathname}#${id}.${key}`.
  5. Display and copy behavior unchanged from v1 (read-only field + Copy
     button with confirmation).
- Loading/error states: the Generate button should show a pending state while
  the network call is in flight (not just the local encryption, which is now
  the smaller part of the latency), and surface a simple error message if the
  API call fails (e.g. network error, `400`/`500` response).

## Non-Goals

- No retry logic on failure — a visible error message the user can retry by
  clicking Generate again is sufficient.
- No changes to the destroy-rule UI controls themselves (radio buttons,
  datetime picker) — only what happens on submit.

## Definition of Done

- Clicking "Generate Link" with the API running produces a link of the form
  `.../#<id>.<key>` (two dot-separated segments, not the old three-segment
  `key.iv.ciphertext` format).
- The generated link's `id` segment corresponds to a real entry in Redis
  (verifiable via the API directly, per specs/07's verification).
- If the API call fails, the UI shows an error message instead of a broken or
  misleading link, and the Generate button becomes clickable again (not stuck
  in a permanent pending state).
- Each destroy rule (none, one-view, expires-at) results in a distinct,
  correct `ttlSeconds`/`oneView` payload sent to the API.

## Verification

1. With `vercel dev` running (frontend + API), open the app, type a secret,
   leave destroy rule as default, click "Generate Link" — confirm a link
   appears in the `id.key` format.
2. Repeat with "Destroy after one view" selected — confirm a new link appears.
3. Repeat with "Expires at" and a near-future timestamp — confirm a new link
   appears.
4. Temporarily stop the API (or block the network via browser devtools) and
   click "Generate Link" — confirm an error message appears and the button is
   not stuck disabled.
5. Copy button still copies the exact displayed link, matching v1 behavior.
