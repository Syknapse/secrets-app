# Secrets Sharing App — 40-Minute MVP Plan

## Context

`specs/spec.md` asks for a React+TS app where users type a secret, get a shareable
link, and can optionally make the link self-destruct after one view or after a
timestamp. The repo is currently empty (no scaffold), and there's a hard 40-minute
build window. That rules out setting up a backend, database, or hosting pipeline —
the plan below is scoped to a **fully client-side** implementation that can be
built, tested, and demoed within the time box, with the one-view/expiry semantics
implemented as best-effort (not server-enforced) and clearly labeled as such in the
UI/README.

## Approach

**Client-only, zero-backend design:**

1. User types a secret + optional destroy rule (one-view or expiry timestamp).
2. App generates a random AES-GCM key (Web Crypto API), encrypts the secret
   (plus metadata: `{oneView: bool, expiresAt: number|null}`) client-side.
3. Ciphertext is base64url-encoded and put in the URL **fragment** (`#...`), the
   key is embedded in the fragment too — fragments never get sent to a server, so
   this stays entirely client-side and is safe to host as a static site.
4. Opening the link: app reads the fragment, decrypts, checks expiry, and if
   `oneView` is set, uses `localStorage` on that browser to mark it "already
   viewed" (best-effort only — a second device/browser will still see it, disclosed
   in the UI).
5. No server, no database — deployable as a static bundle immediately.

## Steps

1. **Scaffold** (~5 min): `npm create vite@latest . -- --template react-ts`,
   install deps, verify dev server boots.
2. **Crypto utility** (`src/lib/crypto.ts`, ~8 min): `encryptSecret(text, meta)` →
   `{fragment}` and `decryptFromFragment(fragment)` → `{text, meta}` using
   `crypto.subtle` AES-GCM. Keep this isolated and pure so it's easy to test/reason
   about.
3. **Create/share view** (`src/components/CreateSecret.tsx`, ~8 min): textarea for
   the secret, radio/select for destroy rule (one-view vs. expiry datetime input),
   "Generate Link" button → calls crypto util, shows the resulting URL with a copy
   button.
4. **View/reveal view** (`src/components/ViewSecret.tsx`, ~8 min): on load, parse
   `location.hash`, decrypt, enforce expiry/one-view check via `localStorage`,
   render the secret or an "expired / already viewed / invalid link" state.
5. **Routing** (~3 min): no need for a router library — a simple check in `App.tsx`
   (`location.hash` present → show ViewSecret, else CreateSecret) is enough for MVP.
6. **Wire up + polish** (~5 min): basic styling (plain CSS, no component library),
   copy-to-clipboard feedback, disable button while generating.
7. **Manual verification** (~3 min): create a secret with one-view, open link in a
   new tab, confirm it displays once and shows "already viewed" on reload; create
   one with a past expiry and confirm it shows "expired".

## Explicit MVP Non-Goals (call these out to the user in the README)

- No server-side enforcement of one-view/expiry — this is client-side best-effort.
- No persistence/history of created secrets.
- No tests (time-boxed) — manual verification only.
- No auth, no rate limiting, no analytics.

## Verification

- `npm run dev`, manually walk through: create secret → copy link → open in new
  browser tab → confirm reveal + destroy behavior for both one-view and expiry
  modes, per step 7 above.
