# Feature: Project Scaffold

## Objective

Set up a working React + TypeScript project via Vite so subsequent features have
somewhere to live.

## Scope

- Run `npm create vite@latest . -- --template react-ts` in the repo root.
- Install dependencies.
- Confirm the default dev server boots and serves the starter page.
- Remove/ignore unused starter boilerplate (e.g. default counter demo) is optional
  and can be left for feature 03/04 to overwrite.

## Non-Goals

- No routing library, no state management library, no UI component library.
- No backend/server of any kind.

## Definition of Done

- `package.json`, `tsconfig.json`, `vite.config.ts`, and `src/` exist at repo root.
- `npm install` completes with no errors.
- `npm run dev` starts a local dev server without errors.
- `npm run build` produces a production build with no TypeScript errors.

## Verification

1. Run `npm install`.
2. Run `npm run dev` and confirm the terminal prints a local URL with no errors.
3. Open the URL in a browser and confirm the default Vite+React page renders.
4. Run `npm run build` and confirm it exits with status 0.
