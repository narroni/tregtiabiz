import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isValidSession } from "../_lib/session.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  const secret = process.env.CMS_SESSION_SECRET;
  const authed = !!secret && isValidSession(req.headers.cookie, secret);
  return res.status(200).json({ authed });
}
