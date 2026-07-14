import { useState } from "react";
import { encryptSecret } from "../lib/crypto";

type DestroyRule = "none" | "oneView" | "expires";

export function CreateSecret() {
  const [secretText, setSecretText] = useState("");
  const [destroyRule, setDestroyRule] = useState<DestroyRule>("none");
  const [expiresAt, setExpiresAt] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");

  const canGenerate = secretText.trim().length > 0 && !isGenerating;

  async function handleGenerate() {
    if (!canGenerate) return;

    setIsGenerating(true);
    setCopyLabel("Copy");
    try {
      const meta = {
        oneView: destroyRule === "oneView",
        expiresAt: destroyRule === "expires" && expiresAt ? new Date(expiresAt).getTime() : null,
      };
      const fragment = await encryptSecret(secretText, meta);
      const url = `${location.origin}${location.pathname}#${fragment}`;
      setLink(url);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 1500);
  }

  return (
    <div className="create-secret">
      <h1>Share a secret</h1>

      <label htmlFor="secret-text">Secret</label>
      <textarea
        id="secret-text"
        value={secretText}
        onChange={(e) => setSecretText(e.target.value)}
        placeholder="Type the secret you want to share..."
        rows={6}
      />

      <fieldset>
        <legend>Destroy rule</legend>
        <label>
          <input
            type="radio"
            name="destroy-rule"
            value="none"
            checked={destroyRule === "none"}
            onChange={() => setDestroyRule("none")}
          />
          No restriction
        </label>
        <label>
          <input
            type="radio"
            name="destroy-rule"
            value="oneView"
            checked={destroyRule === "oneView"}
            onChange={() => setDestroyRule("oneView")}
          />
          Destroy after one view
        </label>
        <label>
          <input
            type="radio"
            name="destroy-rule"
            value="expires"
            checked={destroyRule === "expires"}
            onChange={() => setDestroyRule("expires")}
          />
          Expires at
        </label>
        {destroyRule === "expires" && (
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        )}
      </fieldset>

      <button type="button" onClick={handleGenerate} disabled={!canGenerate}>
        {isGenerating ? "Generating..." : "Generate Link"}
      </button>

      {link && (
        <div className="generated-link">
          <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
          <button type="button" onClick={handleCopy}>
            {copyLabel}
          </button>
        </div>
      )}
    </div>
  );
}
