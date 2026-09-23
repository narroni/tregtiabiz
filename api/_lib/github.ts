// Shared helpers for talking to the GitHub Contents API — used by both
// api/cms/save.ts (commits site-data.json) and api/cms/upload.ts (commits
// uploaded images). GitHub is the only persistence layer this project has;
// there is no database.

export type GithubConfig = { token: string; repo: string; branch: string };

/** Reads and normalizes the GitHub env vars, trimming stray whitespace and
 *  accepting a full https://github.com/owner/repo(.git) URL for GITHUB_REPO
 *  as well as the plain "owner/repo" form. Returns null if not configured. */
export function getGithubConfig(): GithubConfig | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "");
  const branch = process.env.GITHUB_BRANCH?.trim() || "main";
  if (!token || !repo) return null;
  return { token, repo, branch };
}

export function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "tregtia-cms",
  };
}

/** Extracts GitHub's actual error message (plus HTTP status) from a failed
 *  response, so failures are self-diagnosable in the admin UI. */
export async function describeGithubError(res: Response): Promise<string> {
  const status = `HTTP ${res.status}`;
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { message?: string };
    return body.message ? `${status}: ${body.message}` : `${status}: ${text}`;
  } catch {
    return `${status}: ${text}`;
  }
}
