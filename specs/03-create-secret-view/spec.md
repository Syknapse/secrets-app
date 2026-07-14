# Feature: Create/Share Secret View

## Objective

Let a user type a secret, choose an optional destroy rule, and get back a
shareable link containing the encrypted secret.

## Scope

- File: `src/components/CreateSecret.tsx`.
- Textarea input for the secret text.
- Destroy-rule control: a choice between:
  - "No restriction" (default)
  - "Destroy after one view"
  - "Expires at" + a datetime picker (HTML `<input type="datetime-local">`)
- "Generate Link" button that:
  - Calls `encryptSecret` from `src/lib/crypto.ts` (feature 02) with the secret
    text and the chosen `{ oneView, expiresAt }` metadata.
  - Builds a full URL: `${location.origin}${location.pathname}#${fragment}`.
  - Displays the resulting link in a read-only text field.
  - Provides a "Copy" button using `navigator.clipboard.writeText`, with visible
    confirmation feedback (e.g. button label changes to "Copied!" briefly).
- Button is disabled while the secret text is empty, and disabled/shows a spinner
  state during the (brief) async encryption call.

## Non-Goals

- No persistence of created links/history.
- No validation beyond "secret text is non-empty."
- No routing logic (that's feature 05) — this component is just rendered by `App`.

## Definition of Done

- Component renders a textarea, destroy-rule selector, and generate button.
- Clicking "Generate Link" with non-empty text produces a visible URL containing a
  `#` fragment.
- The generated URL, when its fragment is passed to `decryptFromFragment`, decodes
  back to the entered text and chosen metadata.
- Copy button copies the exact URL shown to the clipboard.
- Generate button is disabled when the textarea is empty.

## Verification

1. Run the dev server, load the app (no `#` in URL → create view shows).
2. Type a secret, leave destroy rule as default, click "Generate Link" — confirm a
   URL appears.
3. Select "Destroy after one view", generate again — confirm a new URL appears.
4. Select "Expires at", pick a future timestamp, generate — confirm a new URL
   appears.
5. Click "Copy" and paste into another field/app to confirm clipboard contents
   match the displayed URL.
6. Confirm the Generate button is disabled when the textarea is empty.
