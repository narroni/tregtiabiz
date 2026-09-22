#!/usr/bin/env node
// Local diagnostic — checks a password against a record using the exact same
// logic the live site uses, without needing to deploy or share anything.
//
// Usage:
//   node scripts/verify-password.mjs "<the CMS_PASSWORD_HASH value from Vercel>" "<the password you are typing on the site>"
//
// Prints MATCH or NO MATCH. Nothing is sent anywhere — this only runs on your
// own machine.

import crypto from "node:crypto";

function verifyPassword(password, record) {
  const parts = record.trim().split(":").map((p) => p.trim());
  if (parts.length !== 3) {
    console.log("Record is malformed — expected 3 parts separated by ':', got", parts.length);
    console.log("Did you copy extra text (labels, blank lines) along with the value?");
    return false;
  }
  const [iterStr, saltHex, hashHex] = parts;
  const iterations = Number(iterStr);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    console.log("First part isn't a valid iteration count:", JSON.stringify(iterStr));
    return false;
  }
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) {
    console.log("Salt or hash isn't valid hex — the value may have been truncated when pasted.");
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = crypto.pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

const [record, password] = process.argv.slice(2);
if (!record || !password) {
  console.error('Usage: node scripts/verify-password.mjs "<record>" "<password>"');
  process.exit(1);
}

console.log(verifyPassword(password, record) ? "MATCH" : "NO MATCH");
