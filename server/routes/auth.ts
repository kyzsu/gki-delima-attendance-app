import { Router } from "express";
import { z } from "zod";
import { hashPassword, signToken, verifyPassword } from "../auth.js";
import { sql, type AttendanceRow, type UserRow } from "../db.js";
import { invalidateUser, requireAuth, publicUser } from "../middleware.js";
import { AUTO_APPROVE_MS, DEMO_MODE, dateStr, shiftsFor } from "../rules.js";

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().trim().min(3),
  nip: z.string().trim().min(3),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(8),
  password: z.string().min(8),
  agreed: z.literal(true),
});

// Signup → account is created `pending` and waits for admin approval
// (auto-approved after ~4.5 s in demo mode, mirroring the prototype).
authRouter.post("/signup", async (req, res) => {
  const body = signupSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data pendaftaran tidak lengkap.", issues: body.error.issues });
    return;
  }
  const { name, nip, email, phone, password } = body.data;
  const [exists] = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (exists) {
    res.status(409).json({ error: "Email sudah terdaftar." });
    return;
  }
  const [created] = await sql<{ id: number }[]>`
    INSERT INTO users (name, nip, email, phone, password_hash)
    VALUES (${name}, ${nip}, ${email}, ${phone}, ${hashPassword(password)})
    RETURNING id
  `;
  res.status(201).json({ id: created!.id, status: "pending" });
});

// Approval polling for /signup/approval. Auto-approval happens lazily here
// (rather than via a timer) so it works across serverless invocations.
authRouter.get("/signup/:id/status", async (req, res) => {
  const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${Number(req.params.id) || 0}`;
  if (!user) {
    res.status(404).json({ error: "Pendaftaran tidak ditemukan." });
    return;
  }
  if (DEMO_MODE && user.status === "pending") {
    // Compare against the database clock — the app server's clock can drift.
    const updated = await sql`
      UPDATE users SET status = 'approved'
      WHERE id = ${user.id} AND status = 'pending'
        AND created_at <= now() - make_interval(secs => ${AUTO_APPROVE_MS / 1000})
      RETURNING id
    `;
    if (updated.length > 0) {
      user.status = "approved";
      invalidateUser(user.id);
    }
  }
  res.json({ id: user.id, status: user.status });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Email dan kata sandi wajib diisi." });
    return;
  }
  const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE email = ${body.data.email}`;
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

// "Lupa kata sandi" — records a reset request for the admin to act on
// (no email service; the admin relays a temporary password in person).
// Always responds the same way so account existence isn't leaked.
const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });

authRouter.post("/forgot", async (req, res) => {
  const body = forgotSchema.safeParse(req.body);
  if (body.success) {
    await sql`
      UPDATE users SET reset_requested_at = now()
      WHERE email = ${body.data.email} AND status = 'approved'
    `;
    const [u] = await sql<{ id: number }[]>`SELECT id FROM users WHERE email = ${body.data.email}`;
    if (u) invalidateUser(u.id);
  }
  res.json({
    ok: true,
    message: "Permintaan tercatat. Hubungi Koordinator Personalia untuk menerima kata sandi sementara.",
  });
});

// Change password — also clears the forced-change flag after an admin reset.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const body = changePasswordSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Kata sandi baru minimal 8 karakter." });
    return;
  }
  const user = req.user!;
  if (!verifyPassword(body.data.currentPassword, user.password_hash)) {
    res.status(401).json({ error: "Kata sandi saat ini salah." });
    return;
  }
  await sql`
    UPDATE users
    SET password_hash = ${hashPassword(body.data.newPassword)},
        must_change_password = false, reset_requested_at = NULL
    WHERE id = ${user.id}
  `;
  invalidateUser(user.id);
  res.json({ ok: true });
});

// Profile + today's attendance in one call (backs /home and /profile).
// `today` is the currently open session (or the last closed one when more
// shifts remain); `todayDone` says every scheduled session is recorded —
// on Sunday the Tata Usaha schedule has two.
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = req.user!;
  // Admins don't clock in — no attendance state to report.
  if (user.role === "admin") {
    res.json({ user: publicUser(user), today: null, todayDone: false, remainingShifts: null });
    return;
  }
  const date = dateStr();
  const sessions = await sql<AttendanceRow[]>`
    SELECT * FROM attendance WHERE user_id = ${user.id} AND date = ${date} ORDER BY shift
  `;
  const shifts = shiftsFor(user.position, date);
  const open = sessions.find((s) => !s.check_out);
  // Off-days allow a single "tugas khusus" session.
  const required = Math.max(shifts.length, 1);
  const todayDone = !open && sessions.length >= required;
  res.json({
    user: publicUser(user),
    today: open
      ? {
          checkIn: open.check_in,
          checkOut: null,
          shift: open.shift,
          late: open.late,
          special: open.special,
          distanceM: open.distance_m,
        }
      : null,
    todayDone,
    remainingShifts: open ? null : Math.max(0, (shifts.length || 1) - sessions.length),
  });
});
