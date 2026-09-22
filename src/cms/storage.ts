// Flat-file CMS — all data persisted in localStorage.
// Passwords are stored only as salted PBKDF2 hashes; the plaintext never touches storage.
//
// NOTE: this is a client-only CMS with no backend. Edits made here persist only in the
// browser that made them and are never synced to other visitors/devices. It is a local
// content-staging tool, not a shared/production content pipeline.

export type CmsProject = {
  id: string;
  name: string;
  neighborhood: string;
  location: string;
  investor: string;
  use: string;
  img: string;
  images: string[];
  alt: string;
  desc: string;
  specs: string;
};

export type CmsData = {
  projects: CmsProject[];
  heroImages: string[];
  social: { instagram: string; facebook: string };
};

const DATA_KEY = "tregtia_cms_data";
// Bumped from the old plain-SHA-256 key: the stored format changed (salted PBKDF2 record),
// so any previously-set password is intentionally invalidated and must be re-created.
const PWD_KEY = "tregtia_cms_pwd_v2";
const AUTH_KEY = "tregtia_cms_auth";
const ATTEMPTS_KEY = "tregtia_cms_attempts";

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function pbkdf2Hex(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" }, keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(bits));
}

/** Creates a `iterations:saltHex:hashHex` record for a new password. */
export async function createPasswordRecord(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${hash}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies a password against a record produced by `createPasswordRecord`. */
export async function verifyPassword(password: string, record: string): Promise<boolean> {
  const [iterStr, saltHex, hashHex] = record.split(":");
  const iterations = Number(iterStr);
  if (!iterations || !saltHex || !hashHex) return false;
  const candidate = await pbkdf2Hex(password, hexToBytes(saltHex), iterations);
  return timingSafeEqual(candidate, hashHex);
}

export function loadCms(): CmsData | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? (JSON.parse(raw) as CmsData) : null;
  } catch {
    return null;
  }
}

export function saveCms(data: CmsData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function getStoredPasswordRecord(): string | null {
  return localStorage.getItem(PWD_KEY);
}

export function storePasswordRecord(record: string): void {
  localStorage.setItem(PWD_KEY, record);
}

export function isAuthed(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

export function setAuthed(v: boolean): void {
  if (v) sessionStorage.setItem(AUTH_KEY, "1");
  else sessionStorage.removeItem(AUTH_KEY);
}

// ── Basic login throttling (deters casual/scripted brute-forcing of the login form) ──
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 30_000;

type AttemptState = { count: number; lockedUntil: number };

function readAttempts(): AttemptState {
  try {
    const raw = sessionStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw) as AttemptState;
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writeAttempts(state: AttemptState): void {
  sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state));
}

/** Returns remaining lockout milliseconds (0 if not locked). */
export function getLockoutRemainingMs(): number {
  const { lockedUntil } = readAttempts();
  return Math.max(0, lockedUntil - Date.now());
}

export function recordFailedAttempt(): void {
  const state = readAttempts();
  const count = state.count + 1;
  const lockedUntil = count >= LOCKOUT_THRESHOLD ? Date.now() + LOCKOUT_MS : state.lockedUntil;
  writeAttempts({ count, lockedUntil });
}

export function clearAttempts(): void {
  sessionStorage.removeItem(ATTEMPTS_KEY);
}

// ── URL safety ────────────────────────────────────────────────────────────────
/** Only allow http(s) URLs to be used as clickable links (blocks javascript:, data:, etc.). */
export function isSafeHttpUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
