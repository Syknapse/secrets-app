import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { randomBytes } from "node:crypto";

const MAX_TTL_SECONDS = 30 * 24 * 60 * 60;

const redis = Redis.fromEnv();

interface CreateSecretBody {
  iv: string;
  ciphertext: string;
  oneView: boolean;
  ttlSeconds: number;
}

function isValidBody(body: unknown): body is CreateSecretBody {
  if (typeof body !== "object" || body === null) return false;
  const { iv, ciphertext, oneView, ttlSeconds } = body as Record<
    string,
    unknown
  >;
  return (
    typeof iv === "string" &&
    iv.length > 0 &&
    typeof ciphertext === "string" &&
    ciphertext.length > 0 &&
    typeof oneView === "boolean" &&
    typeof ttlSeconds === "number" &&
    Number.isInteger(ttlSeconds) &&
    ttlSeconds > 0 &&
    ttlSeconds <= MAX_TTL_SECONDS
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isValidBody(req.body)) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { iv, ciphertext, oneView, ttlSeconds } = req.body;
  const id = randomBytes(20).toString("base64url");

  await redis.set(id, JSON.stringify({ iv, ciphertext, oneView }), {
    ex: ttlSeconds,
  });

  res.status(201).json({ id });
}
