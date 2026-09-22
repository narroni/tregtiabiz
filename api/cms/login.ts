import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyPassword } from "../_lib/password";
import { createSessionCookie } from "../_lib/session";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const record = process.env.CMS_PASSWORD_HASH;
  const secret = process.env.CMS_SESSION_SECRET;
  if (!record || !secret) {
    return res.status(500).json({ error: "CMS is not configured. Set CMS_PASSWORD_HASH and CMS_SESSION_SECRET." });
  }

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password || !verifyPassword(password, record)) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  res.setHeader("Set-Cookie", createSessionCookie(secret));
  return res.status(200).json({ ok: true });
}
