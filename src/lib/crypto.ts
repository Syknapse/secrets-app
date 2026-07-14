interface SecretMeta {
  oneView: boolean;
  expiresAt: number | null;
}

interface DecryptedSecret {
  text: string;
  meta: SecretMeta;
}

const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptSecret(text: string, meta: SecretMeta): Promise<string> {
  const key = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const plaintext = new TextEncoder().encode(JSON.stringify({ text, meta }));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext),
  );

  return [toBase64Url(key), toBase64Url(iv), toBase64Url(ciphertext)].join(".");
}

export async function decryptFromFragment(fragment: string): Promise<DecryptedSecret | null> {
  try {
    const parts = fragment.split(".");
    if (parts.length !== 3) return null;

    const [keyPart, ivPart, ciphertextPart] = parts;
    const key = fromBase64Url(keyPart);
    const iv = fromBase64Url(ivPart);
    const ciphertext = fromBase64Url(ciphertextPart);

    if (key.length !== KEY_LENGTH || iv.length !== IV_LENGTH) return null;

    const cryptoKey = await crypto.subtle.importKey("raw", key.buffer as ArrayBuffer, "AES-GCM", false, [
      "decrypt",
    ]);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      cryptoKey,
      ciphertext.buffer as ArrayBuffer,
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext));

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.text !== "string" ||
      typeof parsed.meta !== "object" ||
      parsed.meta === null ||
      typeof parsed.meta.oneView !== "boolean" ||
      (typeof parsed.meta.expiresAt !== "number" && parsed.meta.expiresAt !== null)
    ) {
      return null;
    }

    return { text: parsed.text, meta: { oneView: parsed.meta.oneView, expiresAt: parsed.meta.expiresAt } };
  } catch {
    return null;
  }
}
