// Password hashing (scrypt) and compact HS256 JWTs — node:crypto only,
// no external auth dependencies.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SECRET = process.env.JWT_SECRET ?? "gki-delima-dev-secret-change-me";
const TOKEN_TTL_S = 7 * 24 * 60 * 60; // 7 days

// ── Passwords ────────────────────────────────────────────────────
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ── Tokens ───────────────────────────────────────────────────────
export interface TokenPayload {
  uid: number;
  role: "employee" | "admin";
  exp: number;
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

export function signToken(uid: number, role: TokenPayload["role"]) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ uid, role, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_S }),
  );
  const sig = createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", SECRET).update(`${header}.${payload}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as TokenPayload;
    if (typeof data.uid !== "number" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}
