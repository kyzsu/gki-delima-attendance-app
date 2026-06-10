import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./auth.js";
import { sql, type UserRow } from "./db.js";

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
  const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${payload.uid}`;
  if (!user || user.status !== "approved") {
    res.status(403).json({ error: "Akun belum aktif." });
    return;
  }
  req.user = user;
  next();
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
