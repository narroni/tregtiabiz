import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isValidSession } from "../_lib/session.js";
import { getGithubConfig, githubHeaders, describeGithubError } from "../_lib/github.js";

const FILE_PATH = "src/content/site-data.json";

function isSafeHttpUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  try {
    // A base is required so relative paths (e.g. "/uploads/foo.jpg", from
    // api/cms/upload.ts) resolve instead of throwing; it's discarded when
    // the input is already an absolute URL.
    const u = new URL(url, "https://placeholder.invalid");
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type Localized = { en: string; sq: string };
type CmsProject = {
  id: string; neighborhood: string; location: string; investor: string; use: string;
  img: string; images: string[]; featured: boolean;
  name: Localized; alt: Localized; desc: Localized; specs: Localized;
};

function isLocalized(v: unknown): v is Localized {
  return !!v && typeof v === "object" && typeof (v as Record<string, unknown>).en === "string" && typeof (v as Record<string, unknown>).sq === "string";
}

/** Validates the shape the frontend needs, and re-checks URL safety
 *  server-side (defense in depth — the browser check can be bypassed by
 *  calling this endpoint directly). */
function validate(data: unknown): { ok: true; value: { projects: CmsProject[]; heroImages: string[]; social: { instagram: string; facebook: string } } } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Payload must be an object." };
  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.projects)) return { ok: false, error: "projects must be an array." };
  for (const p of d.projects) {
    if (!p || typeof p !== "object") return { ok: false, error: "Each project must be an object." };
    const proj = p as Record<string, unknown>;
    if (typeof proj.id !== "string" || !proj.id) return { ok: false, error: "Each project needs an id." };
    if (!isLocalized(proj.name)) return { ok: false, error: `Project ${proj.id}: name must have "en" and "sq" text.` };
    if (!isLocalized(proj.alt)) return { ok: false, error: `Project ${proj.id}: alt text must have "en" and "sq".` };
    if (!isLocalized(proj.desc)) return { ok: false, error: `Project ${proj.id}: description must have "en" and "sq" text.` };
    if (!isLocalized(proj.specs)) return { ok: false, error: `Project ${proj.id}: specs must have "en" and "sq" text.` };
    if (typeof proj.featured !== "boolean") return { ok: false, error: `Project ${proj.id}: featured must be true/false.` };
    if (!Array.isArray(proj.images)) return { ok: false, error: `Project ${proj.id}: images must be an array.` };
    for (const img of proj.images) {
      if (!isSafeHttpUrl(img)) return { ok: false, error: `Project ${proj.id}: only http(s) image URLs are allowed.` };
    }
    if (proj.img && !isSafeHttpUrl(proj.img)) return { ok: false, error: `Project ${proj.id}: cover image must be an http(s) URL.` };
  }

  if (!Array.isArray(d.heroImages) || d.heroImages.length < 1) {
    return { ok: false, error: "heroImages must be a non-empty array." };
  }
  for (const img of d.heroImages) {
    if (!isSafeHttpUrl(img)) return { ok: false, error: "Only http(s) hero image URLs are allowed." };
  }

  const social = d.social as Record<string, unknown> | undefined;
  const instagram = social && typeof social.instagram === "string" && (social.instagram === "" || isSafeHttpUrl(social.instagram)) ? social.instagram : "";
  const facebook = social && typeof social.facebook === "string" && (social.facebook === "" || isSafeHttpUrl(social.facebook)) ? social.facebook : "";

  return {
    ok: true,
    value: {
      projects: d.projects as CmsProject[],
      heroImages: d.heroImages as string[],
      social: { instagram, facebook },
    },
  };
}

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

  const validated = validate(req.body);
  if (!validated.ok) return res.status(400).json({ error: validated.error });

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${FILE_PATH}`;
  const headers = githubHeaders(token);

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    if (!getRes.ok) {
      return res.status(502).json({ error: "Could not read current content from GitHub.", detail: await describeGithubError(getRes) });
    }
    const current = (await getRes.json()) as { sha: string };

    const content = Buffer.from(JSON.stringify(validated.value, null, 2) + "\n").toString("base64");

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "Update site content via CMS",
        content,
        sha: current.sha,
        branch,
      }),
    });

    if (!putRes.ok) {
      return res.status(502).json({ error: "GitHub update failed.", detail: await describeGithubError(putRes) });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(502).json({ error: "Unexpected error talking to GitHub.", detail: String(err) });
  }
}
