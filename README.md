# Secrets Sharing

A client-only React + TypeScript app for sharing a secret via a one-time link.
The secret is encrypted in the browser (AES-GCM via the Web Crypto API) and the
key + ciphertext are packed into the URL fragment, so links work with no
backend or database.

See `specs/spec.md` for the original spec and `specs/*/spec.md` for the
per-feature breakdown this was built from.

## Getting started

```bash
npm install
npm run dev
```

## MVP non-goals

This is a time-boxed MVP. The following are intentionally out of scope:

- **No server-side enforcement of one-view/expiry.** These are enforced
  client-side (via `localStorage`) on a best-effort, per-browser basis — a
  different browser or device can still open a "one-view" link.
- **No persistence or history** of previously created secrets.
- **No automated test suite** — features were verified manually against each
  spec's Definition of Done.
- **No auth, rate limiting, or analytics.**
