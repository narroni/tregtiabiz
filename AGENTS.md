# Tregtia website

React + Vite + Tailwind CSS landing page for Tregtia Sh.p.k., a residential developer
in Kosovo, plus a lightweight in-browser admin panel for editing site content.

## Development

```
npm install
npm run dev       # start the Vite dev server
npm run build     # type-check-free production build (see `tsc` below for types)
npm run preview   # preview the production build locally
npm run format    # run oxfmt
```

There is no separate typecheck script; run `npx tsc --noEmit` before shipping changes.

## Project structure

- `src/main.tsx` — React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into `#root`.
- `src/App.tsx` — the public site: nav, hero, about, services, projects, contact, footer.
- `src/content/site-data.json` — the single source of truth for CMS-editable content (projects,
  hero images, social links). Both `App.tsx` and `AdminPage.tsx` import it directly. Translatable
  project fields (`name`, `alt`, `desc`, `specs`) are `{ en, sq }` objects — see `loc()` in `App.tsx`.
- `public/uploads/` — images uploaded from the CMS land here (committed via `api/cms/upload.ts`)
  and are served at `/uploads/<file>` by Vite/Vercel like any other `public/` asset.
- `src/cms/` — the admin panel (`AdminPage.tsx`), shared client-side helpers (`storage.ts`), and
  the upload-image resize helper (`resizeImage.ts`).
- `api/cms/` — Vercel serverless functions: `login.ts`, `logout.ts`, `session.ts`, `save.ts`, `upload.ts`.
- `api/_lib/` — server-only helpers shared by the functions above (`session.ts`, `password.ts`, `github.ts`).
- `scripts/hash-password.mjs` — run locally to generate the `CMS_PASSWORD_HASH` env var value.
- `scripts/verify-password.mjs` — local diagnostic: checks a password against a record without deploying.
- `src/icons.tsx` — brand-mark icons (Instagram, Facebook) that generic sets like lucide deliberately
  omit; everything else icon-shaped uses `lucide-react` directly.
- `src/ThreeCanvas.tsx` — pure Three.js scene setup (no React), consumed via `useEffect` hooks.
- `src/assets/` — static images bundled into the app (currently just the logo).
- `src/index.css` — Tailwind v4 entrypoint, theme tokens, global styles, keyframes.
- `index.html` — Vite HTML shell; also carries meta tags and the CSP.
- `vite.config.ts` — Vite config: React, Tailwind v4, and the `@` → `src` alias.

## Styling

Tailwind CSS v4 via `@tailwindcss/vite`, imported in `src/index.css` with `@import 'tailwindcss'`.
Design tokens (colors, fonts) live in the `@theme` block in that file. Most component styling in
this codebase currently uses inline `style={{ ... }}` objects rather than Tailwind classes — follow
the existing convention within a file rather than mixing approaches inside the same component.

## The admin panel (`#admin`)

Visiting `/#admin` opens a password-gated editor for projects, hero images, and social links.

**Architecture: GitHub as the database, no separate DB.** Editable content lives in
`src/content/site-data.json`, imported directly by `App.tsx` and `AdminPage.tsx`. There is no
runtime data store — clicking "Publish changes" in the admin panel POSTs the edited JSON to
`/api/cms/save` (a Vercel serverless function), which commits the updated file straight to this
GitHub repo via the GitHub Contents API. That push triggers Vercel's normal auto-deploy, so the
live site picks up the change on the next build (usually under a minute). Every publish is a real
git commit, so version history/rollback comes for free via `git log` / GitHub.

Auth is also server-side: `/api/cms/login` checks the submitted password against
`CMS_PASSWORD_HASH` (a salted PBKDF2 record — see `scripts/hash-password.mjs`) and, on success,
sets a signed, httpOnly session cookie (`api/_lib/session.ts`, using `CMS_SESSION_SECRET`). Nothing
sensitive is ever stored in the browser.

Required environment variables (set in Vercel → Settings → Environment Variables, see
`.env.example`): `CMS_PASSWORD_HASH`, `CMS_SESSION_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO`.

Images can be pasted as a URL or uploaded from a device; uploads are resized/re-encoded to JPEG
client-side (`resizeImage.ts`, capped at 1920px) and committed to `public/uploads/` via
`api/cms/upload.ts` — same GitHub-as-storage approach as content, so there's no separate file
storage or CDN. Because everything (content edits and uploaded images) lands as a real git commit,
the repo will grow over time; that's an accepted tradeoff of not running a database/CDN.

The homepage can be curated: a project's `featured` flag (checkbox in the admin editor) controls
whether it appears in the default homepage set. If no project is marked featured, the homepage
falls back to showing everything (see `Projects` in `App.tsx`).

## Responsive layout

The site uses inline `style={{}}` objects, not CSS classes, so there are no `@media` breakpoints —
structural layout changes (row → column, nav → hamburger menu, grid column counts) go through the
`useMediaQuery` hook in `App.tsx` (breakpoint: `max-width: 860px`), used per-component rather than
globally. Follow that pattern for any new layout that needs to change at a breakpoint; fluid sizing
(font sizes, gaps, padding) should keep using `clamp()`/`minmax()` instead where possible.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in
  single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Run `npx tsc --noEmit` and `npm run build` before committing.
