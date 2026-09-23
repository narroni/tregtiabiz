// Shared types + client-side helpers for the CMS.
//
// Content itself lives in src/content/site-data.json and is edited via the
// /api/cms/* serverless functions (see api/cms/save.ts), which commit the
// updated file straight to the GitHub repo. There is no client-side storage
// of content, sessions, or passwords anymore — auth and persistence are both
// handled server-side so they can't be read or bypassed from the browser.

/** A field the CMS operator fills in for both languages the site supports. */
export type Localized = { en: string; sq: string };

export type CmsProject = {
  id: string;
  neighborhood: string;
  location: string;
  investor: string;
  use: string;
  img: string;
  images: string[];
  /** Shown on the homepage (and counted toward the default set) when true.
   *  If no project has this set, the homepage falls back to showing all. */
  featured: boolean;
  name: Localized;
  alt: Localized;
  desc: Localized;
  specs: Localized;
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
