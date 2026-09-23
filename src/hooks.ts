import { useEffect, useState } from "react";

/** Tracks a CSS media query so layouts can switch at real breakpoints —
 *  needed because this codebase styles with inline `style={{}}` objects
 *  rather than CSS classes, so there's no other way to express "only below
 *  this width" for structural changes (row → column, hidden nav, etc). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
