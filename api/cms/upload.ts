import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import { isValidSession } from "../_lib/session.js";
import { getGithubConfig, githubHeaders, describeGithubError } from "../_lib/github.js";

// The browser always converts uploads to JPEG before sending them here (see
// src/cms/resizeImage.ts), so this is deliberately narrow.
const CONTENT_TYPE = "image/jpeg";
const EXT = "jpg";

// Raw (decoded) byte cap. Vercel's default request body limit is ~4.5MB and
// base64 adds ~33% overhead, so this leaves headroom; the client also
// resizes images before upload so real photos rarely get close to this.
const MAX_BYTES = 3.5 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret || !isValidSession(req.headers.cookie, secret)) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const gh = getGithubConfig();
  if (!gh) {
    return res.status(500).json({ error: "GitHub is not configured. Set GITHUB_TOKEN and GITHUB_REPO." });
  }
  const { token, repo, branch } = gh;

  const dataBase64 = req.body?.dataBase64;
  if (typeof dataBase64 !== "string" || !dataBase64) {
    return res.status(400).json({ error: "Missing image data." });
  }
  // Rough size check without decoding: base64 length * 3/4 ≈ byte length.
  if ((dataBase64.length * 3) / 4 > MAX_BYTES) {
    return res.status(413).json({ error: "Image is too large (max ~3.5MB after compression)." });
  }

  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${EXT}`;
  const path = `public/uploads/${filename}`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify({
        message: `Upload image via CMS: ${filename}`,
        content: dataBase64,
        branch,
      }),
    });

    if (!putRes.ok) {
      return res.status(502).json({ error: "GitHub upload failed.", detail: await describeGithubError(putRes) });
    }

    return res.status(200).json({ url: `/uploads/${filename}`, contentType: CONTENT_TYPE });
  } catch (err) {
    return res.status(502).json({ error: "Unexpected error talking to GitHub.", detail: String(err) });
  }
}
