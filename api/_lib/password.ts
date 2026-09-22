// Verifies a password against an "iterations:saltHex:hashHex" PBKDF2 record,
// as produced by scripts/hash-password.mjs. Runs server-side only — the
// record (CMS_PASSWORD_HASH) is an env var, never sent to the browser.
import crypto from "node:crypto";

export function verifyPassword(password: string, record: string): boolean {
  // Trim defensively: a trailing newline/space is an easy accident when
  // pasting the record into a dashboard env-var field, and would otherwise
  // corrupt the hex parsing below into a silent, confusing mismatch.
  const parts = record.trim().split(":").map((p) => p.trim());
  if (parts.length !== 3) return false;
  const [iterStr, saltHex, hashHex] = parts;
  const iterations = Number(iterStr);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length === 0) return false;

  const candidate = crypto.pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
