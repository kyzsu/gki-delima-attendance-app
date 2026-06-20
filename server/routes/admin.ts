import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { hashPassword } from "../auth.js";
import { sql, type AttendanceRow, type RequestRow, type UserRow } from "../db.js";
import { invalidateUser, publicUser, requireAdmin } from "../middleware.js";
import { approveRequest } from "./requests.js";
import { POSITION_LABEL, addDaysStr, dateStr, shiftsFor, type Position } from "../rules.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// Pending signups (status filter optional: ?status=pending|approved|rejected).
adminRouter.get("/users", async (req, res) => {
  const status = req.query.status;
  const rows =
    typeof status === "string"
      ? await sql<UserRow[]>`SELECT * FROM users WHERE status = ${status} ORDER BY id DESC`
      : await sql<UserRow[]>`SELECT * FROM users ORDER BY id DESC`;
  res.json(rows.map(publicUser));
});

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

adminRouter.post("/users/:id/decision", async (req, res) => {
  const body = decisionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "decision harus 'approved' atau 'rejected'." });
    return;
  }
  const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${Number(req.params.id) || 0}`;
  if (!user) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }
  await sql`UPDATE users SET status = ${body.data.decision} WHERE id = ${user.id}`;
  invalidateUser(user.id);
  res.json({ id: user.id, status: body.data.decision });
});

// Password reset: generates a temporary password shown to the admin once
// (relayed to the employee in person/WA — no email service). The employee
// must change it at the next login.
adminRouter.post("/users/:id/reset-password", async (req, res) => {
  const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${Number(req.params.id) || 0}`;
  if (!user) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }
  const tempPassword = `gki-${randomBytes(4).toString("hex")}`;
  await sql`
    UPDATE users
    SET password_hash = ${hashPassword(tempPassword)},
        must_change_password = true, reset_requested_at = NULL
    WHERE id = ${user.id}
  `;
  invalidateUser(user.id);
  res.json({ id: user.id, tempPassword });
});

// Assign the Pasal 5 work schedule (Tata Usaha / Sopir / Koster).
const positionSchema = z.object({ position: z.enum(["tata_usaha", "sopir", "koster"]) });

adminRouter.post("/users/:id/position", async (req, res) => {
  const body = positionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "position harus tata_usaha, sopir, atau koster." });
    return;
  }
  const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${Number(req.params.id) || 0}`;
  if (!user) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }
  await sql`UPDATE users SET position = ${body.data.position} WHERE id = ${user.id}`;
  invalidateUser(user.id);
  res.json({ id: user.id, position: body.data.position });
});

adminRouter.get("/requests", async (req, res) => {
  const status = req.query.status;
  type Row = RequestRow & { user_name: string };
  const rows =
    typeof status === "string"
      ? await sql<Row[]>`
          SELECT r.*, u.name AS user_name FROM requests r
          JOIN users u ON u.id = r.user_id
          WHERE r.status = ${status} ORDER BY r.id DESC`
      : await sql<Row[]>`
          SELECT r.*, u.name AS user_name FROM requests r
          JOIN users u ON u.id = r.user_id
          ORDER BY r.id DESC`;
  res.json(
    rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      detail: r.detail,
      status: r.status,
      createdAt: r.created_at,
      userName: r.user_name,
      // Structured fields so the admin detail sheet can show complete info.
      leaveType: r.leave_type,
      place: r.place,
      doctorNote: r.doctor_note,
      startDate: r.start_date,
      endDate: r.end_date,
      days: r.days,
      dest: r.dest,
      overnight: r.overnight,
      nights: r.nights,
      amount: r.amount,
      hours: r.hours,
      rejectReason: r.reject_reason,
    })),
  );
});

// Day view of attendance sessions with selfie availability (?date=YYYY-MM-DD,
// default today church-local).
adminRouter.get("/attendance", async (req, res) => {
  const date =
    typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : dateStr();
  type Row = AttendanceRow & { user_name: string; has_in: boolean; has_out: boolean };
  const rows = await sql<Row[]>`
    SELECT a.*, u.name AS user_name,
      EXISTS (SELECT 1 FROM attendance_photos p WHERE p.attendance_id = a.id AND p.kind = 'in')  AS has_in,
      EXISTS (SELECT 1 FROM attendance_photos p WHERE p.attendance_id = a.id AND p.kind = 'out') AS has_out
    FROM attendance a JOIN users u ON u.id = a.user_id
    WHERE a.date = ${date}
    ORDER BY a.check_in
  `;
  res.json({
    date,
    sessions: rows.map((r) => ({
      id: r.id,
      userName: r.user_name,
      shift: r.shift,
      checkIn: r.check_in,
      checkOut: r.check_out,
      late: r.late,
      earlyOut: r.early_out,
      special: r.special,
      distanceM: r.distance_m,
      photoIn: r.has_in,
      photoOut: r.has_out,
    })),
  });
});

// ── Absence ledger — Pasal 5 ayat (8) ────────────────────────────
// Scheduled working days with no attendance and no approved cuti/dinas
// covering them. These cost the attendance-variable tunjangan.
adminRouter.get("/absences", async (req, res) => {
  const month =
    typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : dateStr().slice(0, 7);
  const today = dateStr();
  const from = month + "-01";
  // Up to yesterday (today is still in progress), capped to the month's end.
  const monthEnd = addDaysStr(addDaysStr(month + "-28", 4).slice(0, 7) + "-01", -1);
  const to = [addDaysStr(today, -1), monthEnd].sort()[0]!;
  if (to < from) {
    res.json({ month, from, to: from, absences: [] });
    return;
  }

  const employees = await sql<UserRow[]>`
    SELECT * FROM users WHERE status = 'approved' AND role = 'employee'
  `;
  const attendance = await sql<AttendanceRow[]>`
    SELECT * FROM attendance WHERE date BETWEEN ${from} AND ${to}
  `;
  const leaves = await sql<RequestRow[]>`
    SELECT * FROM requests
    WHERE kind IN ('cuti', 'dinas') AND status = 'Disetujui'
      AND start_date <= ${to} AND end_date >= ${from}
  `;

  const attended = new Set(attendance.map((a) => `${a.user_id}:${a.date}`));
  const covered = (userId: number, date: string) =>
    leaves.some(
      (l) => l.user_id === userId && l.start_date! <= date && date <= l.end_date!,
    );

  const absences: { date: string; userId: number; userName: string; position: string }[] = [];
  for (const u of employees) {
    // Only days from the employee's registration onward count.
    const since = dateStr(new Date(u.created_at));
    for (let date = from; date <= to; date = addDaysStr(date, 1)) {
      if (date < since) continue;
      if (shiftsFor(u.position, date).length === 0) continue; // hari libur (Senin)
      if (attended.has(`${u.id}:${date}`)) continue;
      if (covered(u.id, date)) continue;
      absences.push({
        date,
        userId: u.id,
        userName: u.name,
        position: POSITION_LABEL[u.position as Position],
      });
    }
  }
  absences.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  res.json({ month, from, to, absences });
});

const reqDecisionSchema = z.object({
  decision: z.enum(["Disetujui", "Ditolak"]),
  reason: z.string().trim().max(500).optional(), // required when rejecting
});

adminRouter.post("/requests/:id/decision", async (req, res) => {
  const body = reqDecisionSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "decision harus 'Disetujui' atau 'Ditolak'." });
    return;
  }
  // A rejection must carry a reason — it's shown to the applicant.
  if (body.data.decision === "Ditolak" && !body.data.reason) {
    res.status(400).json({ error: "Alasan penolakan wajib diisi." });
    return;
  }
  const [request] = await sql<RequestRow[]>`
    SELECT * FROM requests WHERE id = ${Number(req.params.id) || 0}
  `;
  if (!request) {
    res.status(404).json({ error: "Pengajuan tidak ditemukan." });
    return;
  }
  if (request.status !== "Menunggu") {
    res.status(409).json({ error: `Pengajuan sudah ${request.status}.` });
    return;
  }
  if (body.data.decision === "Disetujui") {
    await approveRequest(request);
  } else {
    await sql`
      UPDATE requests SET status = 'Ditolak', reject_reason = ${body.data.reason!}
      WHERE id = ${request.id}
    `;
  }
  res.json({ id: request.id, status: body.data.decision });
});
