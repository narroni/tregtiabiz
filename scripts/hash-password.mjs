#!/usr/bin/env node
// Run this locally to generate the value for the CMS_PASSWORD_HASH env var.
//
// Usage (interactive — recommended, asks you to type it twice to confirm):
//   node scripts/hash-password.mjs
//
// Usage (one-shot, e.g. if the interactive prompt misbehaves in your terminal):
//   node scripts/hash-password.mjs "YourChosenPassword123"
//
// Either way, copy the printed record into Vercel as CMS_PASSWORD_HASH. The
// plaintext password is never written anywhere; only this derived record is
// used to verify logins.

import crypto from "node:crypto";
import readline from "node:readline";

const ITERATIONS = 250_000;

function makeRecord(password) {
  if (password.length < 10) {
    console.error("\nPassword must be at least 10 characters.");
    process.exit(1);
  }
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
  return `${ITERATIONS}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function report(record) {
  console.log("\nCopy this whole value into Vercel as CMS_PASSWORD_HASH:\n");
  console.log(record);
  console.log("\n(Consider clearing your terminal scrollback now, e.g. run `clear`.)");
}

const argPassword = process.argv[2];

if (argPassword) {
  report(makeRecord(argPassword));
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (q) => new Promise((resolve) => rl.question(q, resolve));

  const password = await prompt("New CMS admin password (min 10 characters): ");
  const confirm = await prompt("Confirm password: ");
  rl.close();

  if (password !== confirm) {
    console.error("\nPasswords do not match.");
    process.exit(1);
  }
  report(makeRecord(password));
}
