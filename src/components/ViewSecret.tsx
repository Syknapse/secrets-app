import { useEffect, useState } from "react";
import { decryptFromFragment } from "../lib/crypto";

type ViewState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "already-viewed" }
  | { status: "reveal"; text: string };

const STORAGE_PREFIX = "secret-viewed:";

function hashFragment(fragment: string): string {
  let hash = 0;
  for (let i = 0; i < fragment.length; i++) {
    hash = (Math.imul(31, hash) + fragment.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export function ViewSecret() {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    const fragment = location.hash.slice(1);
    const storageKey = STORAGE_PREFIX + hashFragment(fragment);

    decryptFromFragment(fragment).then((decrypted) => {
      if (!decrypted) {
        setState({ status: "invalid" });
        return;
      }

      const { text, meta } = decrypted;

      if (meta.expiresAt !== null && meta.expiresAt < Date.now()) {
        setState({ status: "expired" });
        return;
      }

      if (meta.oneView && localStorage.getItem(storageKey)) {
        setState({ status: "already-viewed" });
        return;
      }

      if (meta.oneView) {
        localStorage.setItem(storageKey, "1");
      }

      setState({ status: "reveal", text });
    });
  }, []);

  if (state.status === "loading") {
    return <div className="view-secret">Decrypting...</div>;
  }

  if (state.status === "invalid") {
    return (
      <div className="view-secret">
        <h1>Invalid link</h1>
        <p>This link is malformed or corrupted.</p>
      </div>
    );
  }

  if (state.status === "expired") {
    return (
      <div className="view-secret">
        <h1>Expired</h1>
        <p>This secret is no longer available.</p>
      </div>
    );
  }

  if (state.status === "already-viewed") {
    return (
      <div className="view-secret">
        <h1>Already viewed</h1>
        <p>This secret was already viewed once in this browser and cannot be shown again.</p>
      </div>
    );
  }

  return (
    <div className="view-secret">
      <h1>Secret</h1>
      <textarea readOnly value={state.text} rows={6} />
      <p className="caption">
        One-view destruction is enforced only in this browser — anyone with this link can still
        open it from another browser or device.
      </p>
    </div>
  );
}
