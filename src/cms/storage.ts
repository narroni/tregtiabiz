// Shared types + client-side helpers for the CMS.
//
// Content itself lives in src/content/site-data.json and is edited via the
// /api/cms/* serverless functions (see api/cms/save.ts), which commit the
// updated file straight to the GitHub repo. There is no client-side storage
// of content, sessions, or passwords anymore — auth and persistence are both
// handled server-side so they can't be read or bypassed from the browser.

export type CmsProject = {
  id: string;
  name: string;
  neighborhood: string;
  location: string;
  investor: string;
  use: string;
  img: string;
  images: string[];
  alt: string;
  desc: string;
  specs: string;
};

export type CmsData = {
  projects: CmsProject[];
  heroImages: string[];
  social: { instagram: string; facebook: string };
};

/** Only allow http(s) URLs to be used as clickable links or image sources
 *  (blocks javascript:, vbscript:, etc.). */
export function isSafeHttpUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
