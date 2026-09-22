// Stateless, signed session cookie — no database/session store needed.
// The cookie carries an expiry timestamp plus an HMAC signature (using
// CMS_SESSION_SECRET) so it can be verified without looking anything up.
import crypto from "node:crypto";

const COOKIE_NAME = "tregtia_cms_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionCookie(secret: string): string {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(exp);
  const token = `${payload}.${sign(payload, secret)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function readCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function isValidSession(cookieHeader: string | undefined, secret: string): boolean {
  const token = readCookie(cookieHeader);
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && Date.now() < exp;
}
