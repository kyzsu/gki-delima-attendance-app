import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./auth.js";
import { sql, type UserRow } from "./db.js";
import { cacheDelete, cacheGet, cacheSet } from "./cache.js";

/** Every authenticated request looks the user up — cache briefly, and bust
 *  the entry whenever a mutation touches the user row. */
const USER_TTL_MS = 30_000;
const userKey = (id: number) => `user:${id}`;

export function invalidateUser(id: number) {
  cacheDelete(userKey(id));
}

declare global {
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}

/** Requires `Authorization: Bearer <token>` from an approved user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: "Sesi tidak valid. Silakan masuk kembali." });
    return;
  }
  let user = cacheGet<UserRow>(userKey(payload.uid));
  if (!user) {
    [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${payload.uid}`;
    if (user) cacheSet(userKey(user.id), user, USER_TTL_MS);
  }
  if (!user || user.status !== "approved") {
    res.status(403).json({ error: "Akun belum aktif." });
    return;
  }
  req.user = user;
  next();
}

/** Attendance and request features are for employees — admins approve, they
 *  don't clock in or file cuti/lembur. */
export async function requireEmployee(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "employee") {
      res.status(403).json({ error: "Fitur ini khusus karyawan." });
      return;
    }
    next();
  });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Hanya admin yang dapat mengakses." });
      return;
    }
    next();
  });
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    nip: u.nip,
    email: u.email,
    phone: u.phone,
    role: u.role,
    position: u.position,
    status: u.status,
    leaveBalance: u.leave_balance,
  };
}
