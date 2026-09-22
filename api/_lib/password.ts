// Verifies a password against an "iterations:saltHex:hashHex" PBKDF2 record,
// as produced by scripts/hash-password.mjs. Runs server-side only — the
// record (CMS_PASSWORD_HASH) is an env var, never sent to the browser.
import crypto from "node:crypto";

export function verifyPassword(password: string, record: string): boolean {
  const [iterStr, saltHex, hashHex] = record.split(":");
  const iterations = Number(iterStr);
  if (!iterations || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = crypto.pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
