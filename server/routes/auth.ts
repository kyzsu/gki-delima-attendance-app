import { Router } from "express";
import { z } from "zod";
import { hashPassword, signToken, verifyPassword } from "../auth.ts";
import { db, type AttendanceRow, type UserRow } from "../db.ts";
import { requireAuth, publicUser } from "../middleware.ts";
import { AUTO_APPROVE_MS, DEMO_MODE, dateStr } from "../rules.ts";

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().trim().min(3),
  nip: z.string().trim().min(3),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8),
  password: z.string().min(8),
  agreed: z.literal(true),
});

// Signup → account is created `pending` and waits for admin approval
// (auto-approved after ~4.5 s in demo mode, mirroring the prototype).
authRouter.post("/signup", (req, res) => {
  const body = signupSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data pendaftaran tidak lengkap.", issues: body.error.issues });
    return;
  }
  const { name, nip, email, phone, password } = body.data;
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) {
    res.status(409).json({ error: "Email sudah terdaftar." });
    return;
  }
  const result = db
    .prepare("INSERT INTO users (name, nip, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)")
    .run(name, nip, email, phone, hashPassword(password));
  res.status(201).json({ id: Number(result.lastInsertRowid), status: "pending" });
});

// Approval polling for /signup/approval. Auto-approval happens lazily here
// (rather than via a timer) so it survives server restarts.
authRouter.get("/signup/:id/status", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.params.id)) as
    | UserRow
    | undefined;
  if (!user) {
    res.status(404).json({ error: "Pendaftaran tidak ditemukan." });
    return;
  }
  if (
    DEMO_MODE &&
    user.status === "pending" &&
    Date.now() - new Date(user.created_at).getTime() >= AUTO_APPROVE_MS
  ) {
    db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(user.id);
    user.status = "approved";
  }
  res.json({ id: user.id, status: user.status });
});

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

authRouter.post("/login", (req, res) => {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Email dan kata sandi wajib diisi." });
    return;
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(body.data.email) as
    | UserRow
    | undefined;
  if (!user || !verifyPassword(body.data.password, user.password_hash)) {
    res.status(401).json({ error: "Email atau kata sandi salah." });
    return;
  }
  if (user.status === "pending") {
    res.status(403).json({ error: "Akun menunggu persetujuan admin.", status: "pending" });
    return;
  }
  if (user.status === "rejected") {
    res.status(403).json({ error: "Pendaftaran ditolak. Hubungi Koordinator Personalia.", status: "rejected" });
    return;
  }
  res.json({ token: signToken(user.id, user.role), user: publicUser(user) });
});

// Profile + today's attendance in one call (backs /home and /profile).
authRouter.get("/me", requireAuth, (req, res) => {
  const user = req.user!;
  const today = db
    .prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?")
    .get(user.id, dateStr()) as AttendanceRow | undefined;
  res.json({
    user: publicUser(user),
    today: today
      ? {
          checkIn: today.check_in,
          checkOut: today.check_out,
          late: !!today.late,
          distanceM: today.distance_m,
        }
      : null,
  });
});
