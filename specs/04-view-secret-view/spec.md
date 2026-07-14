# Feature: View/Reveal Secret View

## Objective

When a user opens a generated link, decrypt and display the secret, honoring the
one-view and expiry destroy rules on a best-effort (client-side only) basis.

## Scope

- File: `src/components/ViewSecret.tsx`.
- On mount, reads `location.hash` (strip leading `#`) and calls
  `decryptFromFragment` (feature 02).
- States to render:
  - **Invalid link**: `decryptFromFragment` returned `null`.
  - **Expired**: `meta.expiresAt` is non-null and in the past.
  - **Already viewed**: `meta.oneView` is true and `localStorage` has a record
    (keyed by a hash of the fragment) marking this link as already shown.
  - **Reveal**: none of the above — show the decrypted secret text in a
    read-only box, and if `meta.oneView` is true, immediately write the
    "already viewed" record to `localStorage` so a reload/re-open shows the
    "Already viewed" state instead.
- UI must clearly disclose that one-view enforcement is per-browser/best-effort,
  not server-guaranteed (e.g. small caption under the reveal).

## Non-Goals

- No server-side state — a different browser/device can still view a
  "one-view" secret; this is explicitly out of scope per the MVP plan.
- No ability to re-share or regenerate a link from this view.

## Definition of Done

- Opening a link with no destroy rule always reveals the secret.
- Opening a link with `oneView: true` reveals the secret once, then shows
  "Already viewed" on any subsequent load of the same link in the same browser.
- Opening a link with a past `expiresAt` shows "Expired" and does not reveal the
  secret text.
- Opening a malformed/garbage fragment shows "Invalid link" and does not throw an
  unhandled error in the console.

## Verification

1. Using a link generated with no destroy rule (feature 03), open it — confirm the
   secret text displays.
2. Reload the same link — confirm it still displays (no restriction).
3. Using a one-view link, open it in a new tab — confirm the secret displays.
4. Reload/reopen the same link in the same browser — confirm "Already viewed"
   shows instead of the secret.
5. Using an expiry link set a few seconds in the future, wait for it to pass, then
   open it — confirm "Expired" shows.
6. Manually edit the URL fragment to garbage characters and open it — confirm
   "Invalid link" shows, with no uncaught exception in the browser console.
