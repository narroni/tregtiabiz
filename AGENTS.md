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
- `src/cms/` — the admin panel (`AdminPage.tsx`) and its persistence layer (`storage.ts`).
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
**Important limitation:** this CMS has no backend. All content and the password hash are stored in
the browser's `localStorage`/`sessionStorage` (see `src/cms/storage.ts`). Edits only apply to the
browser that made them — they are not synced to other visitors or devices. Treat it as a local
content-staging tool, not a production content pipeline. If real multi-device/shared editing is
needed, that requires an actual backend (API + database) and is a separate project.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in
  single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Run `npx tsc --noEmit` and `npm run build` before committing.
