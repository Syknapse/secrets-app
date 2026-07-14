# Feature: Routing, Wiring & Polish

## Objective

Wire `CreateSecret` and `ViewSecret` together into `App.tsx` with simple
hash-presence routing, apply minimal styling, and finish the MVP end-to-end.

## Scope

- File: `src/App.tsx`.
- Logic: if `location.hash` is non-empty on load, render `ViewSecret`; otherwise
  render `CreateSecret`. No router library needed.
- Basic plain CSS (e.g. `src/App.css` or `src/index.css`) for readable layout:
  spacing, a max-width centered container, legible form controls — no component
  library required.
- Add a short README section (or update root `README.md`) documenting the MVP
  non-goals from the plan (no server-side enforcement, no persistence, no tests,
  no auth) so it's clear to anyone opening the repo.

## Non-Goals

- No client-side router library (react-router, etc.).
- No responsive/mobile-specific design work beyond basic usability.
- No deployment/hosting setup.

## Definition of Done

- Loading the app at the bare URL (no fragment) shows the create-secret form.
- Loading the app at a URL with a valid fragment shows the view-secret result
  directly (no flash of the create form).
- Basic styling is applied consistently across both views (not raw unstyled HTML).
- README documents the stated non-goals.

## Verification

1. Run `npm run dev`, open the bare dev URL — confirm the create form shows.
2. Generate a link (feature 03), open it in a new tab — confirm the view/reveal
   screen shows directly, not the create form.
3. Visually confirm both screens have basic, readable styling (not unstyled
   browser-default form elements).
4. Confirm `README.md` lists the MVP non-goals.
5. Run `npm run build` one final time and confirm it succeeds with no errors,
   completing the end-to-end MVP.
