# Feature: Wire `ViewSecret` to the New API

## Objective

Replace `ViewSecret`'s local fragment decryption and `localStorage`-based
one-view hack with the real fetch-then-decrypt flow against the server, and
simplify its state machine to match the API's collapsed 404 semantics.

## Scope

- File: `src/components/ViewSecret.tsx`.
- On mount:
  1. Parse `location.hash` (strip leading `#`) into `id` and `key` by
     splitting on the first `.`.
  2. If parsing fails (no `.`, empty `id`, or empty `key`) → render the
     "Invalid link" state without calling the API.
  3. Otherwise call `fetchSecret(id)` (specs/09).
     - `null` (404) → render a single "gone" state: "This secret is no longer
       available." (Replaces v1's separate Expired/Already-viewed states —
       the server cannot distinguish the two, per
       specs/spec-v2-persistence.md.)
     - `{iv, ciphertext}` → call `decrypt(key, iv, ciphertext)` (specs/09).
       - `null` → render "Invalid link" (wrong key or corrupted data).
       - decrypted text → render the reveal state with the secret text.
- Remove the `localStorage`/`hashFragment` one-view-tracking logic entirely —
  the server (via `GETDEL`, specs/08) is now the sole authority; the client no
  longer needs to remember anything between loads.
- Keep the existing best-effort disclosure caption, but update its wording
  since one-view is now actually server-enforced (no longer "per-browser
  best-effort" — the caveat to keep, if any, is narrower: e.g. simultaneous
  opens across devices still only let one through, which is now a *feature*,
  not a caveat).

## Non-Goals

- No distinguishing expired vs. already-viewed in the UI (accepted
  simplification, matches specs/08).
- No offline/retry handling beyond a plain fetch failure falling into the
  existing "gone"/"invalid" states (a network error can reasonably map to
  "Invalid link" or a new lightweight "error" state — implementer's choice,
  document whichever is picked).

## Definition of Done

- Opening a link for a `oneView: false` secret reveals it, and reloading the
  same link reveals it again (server allows repeat reads until TTL expiry).
- Opening a link for a `oneView: true` secret reveals it once; reloading or
  reopening the same link afterward shows the "gone" state — driven by the
  API's `404`, not any client-side flag.
- Opening a link for an expired secret shows the "gone" state.
- Opening a malformed fragment (no `.`, garbage `id`) shows "Invalid link"
  without an unhandled exception in the console.
- No `localStorage` reads/writes remain in `ViewSecret.tsx`.

## Verification

1. Using a no-restriction link generated via specs/10, open it — confirm
   reveal — reload — confirm it still reveals.
2. Using a one-view link, open it once — confirm reveal — reopen the same
   link (same browser) — confirm "gone" state, not the old "Already viewed"
   text.
3. Open the same one-view link from a second browser/incognito window — since
   it's already consumed, confirm it also shows "gone" (proves server-side
   enforcement works across browsers, unlike v1).
4. Using an expiry link a few seconds out, wait, open it — confirm "gone".
5. Manually edit the fragment to garbage (no `.` separator) and open it —
   confirm "Invalid link" with no uncaught exception in the browser console.
