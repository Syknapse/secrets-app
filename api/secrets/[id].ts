import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

interface StoredSecret {
  iv: string;
  ciphertext: string;
  oneView: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const stored = await redis.get<StoredSecret>(id);
  if (stored === null) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  if (!stored.oneView) {
    res.status(200).json({ iv: stored.iv, ciphertext: stored.ciphertext });
    return;
  }

  const consumed = await redis.getdel<StoredSecret>(id);
  if (consumed === null) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.status(200).json({ iv: consumed.iv, ciphertext: consumed.ciphertext });
}
