import { Router } from "express";
import { z } from "zod";
import { db, type RequestRow, type UserRow } from "../db.ts";
import { requireAuth } from "../middleware.ts";
import {
  DARURAT_MAX_DAYS,
  DARURAT_MAX_PER_MONTH,
  DARURAT_MAX_PER_YEAR,
  DINAS_DESTINATIONS,
  DINAS_MAX_NIGHTS,
  DUKA_MAX_DAYS,
  LEAVE_LABEL,
  LEMBUR_DAILY_CAP_H,
  LEMBUR_MAX_H,
  LEMBUR_STEP_H,
  LEMBUR_TARIFF,
  LEMBUR_WEEKLY_CAP_H,
  dateStr,
  dinasAllowance,
  fmtHours,
  fmtIDR,
  isJabodetabek,
  weekEnd,
  weekStart,
} from "../rules.ts";

export const requestsRouter = Router();
requestsRouter.use(requireAuth);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD");

function publicRequest(r: RequestRow) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    detail: r.detail,
    status: r.status,
    createdAt: r.created_at,
  };
}

requestsRouter.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM requests WHERE user_id = ? ORDER BY id DESC")
    .all(req.user!.id) as unknown as RequestRow[];
  res.json(rows.map(publicRequest));
});

// ── Cuti — dynamic rules per leave type ──────────────────────────
const cutiSchema = z.object({
  type: z.enum(["tahunan", "sakit", "darurat", "duka"]),
  startDate: dateSchema,
  days: z.number().int().min(1).optional(),
  place: z.enum(["inCity", "outside"]).optional(), // duka only
  doctorNote: z.boolean().optional(), // sakit only
});

requestsRouter.post("/cuti", (req, res) => {
  const body = cutiSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data cuti tidak valid.", issues: body.error.issues });
    return;
  }
  const user = req.user!;
  const { type, startDate, place, doctorNote } = body.data;
  let days = body.data.days ?? 1;

  if (type === "tahunan" && days > user.leave_balance) {
    res.status(422).json({
      error: `Saldo cuti tahunan tidak cukup (sisa ${user.leave_balance} hari).`,
      leaveBalance: user.leave_balance,
    });
    return;
  }
  if (type === "sakit" && !doctorNote) {
    res.status(422).json({
      error: "Lampirkan surat dokter agar saldo tahunan tidak terpotong.",
      reason: "doctor-note-required",
    });
    return;
  }
  if (type === "darurat") {
    if (days > DARURAT_MAX_DAYS) {
      res.status(422).json({ error: `Cuti darurat maks ${DARURAT_MAX_DAYS} hari/pengajuan.` });
      return;
    }
    const month = startDate.slice(0, 7);
    const year = startDate.slice(0, 4);
    const count = (range: string) =>
      (db
        .prepare(
          `SELECT COUNT(*) AS n FROM requests
           WHERE user_id = ? AND leave_type = 'darurat' AND status != 'Ditolak'
             AND start_date LIKE ?`,
        )
        .get(req.user!.id, range + "%") as { n: number }).n;
    if (count(month) >= DARURAT_MAX_PER_MONTH) {
      res.status(422).json({ error: `Cuti darurat maks ${DARURAT_MAX_PER_MONTH}×/bulan.` });
      return;
    }
    const usedThisYear = count(year);
    if (usedThisYear >= DARURAT_MAX_PER_YEAR) {
      res.status(422).json({
        error: `Kuota cuti darurat tahun ini habis (${usedThisYear}/${DARURAT_MAX_PER_YEAR}).`,
        used: usedThisYear,
      });
      return;
    }
  }
  if (type === "duka") {
    if (!place) {
      res.status(400).json({ error: "Lokasi duka wajib dipilih." });
      return;
    }
    const max = DUKA_MAX_DAYS[place];
    if (body.data.days === undefined) days = max;
    if (days > max) {
      res.status(422).json({
        error: `Cuti duka ${place === "inCity" ? "dalam kota" : "luar Jawa"} maks ${max} hari.`,
        maxDays: max,
      });
      return;
    }
  }

  const end = new Date(startDate + "T00:00:00");
  end.setDate(end.getDate() + days - 1);
  const endDate = dateStr(end);

  const result = db
    .prepare(
      `INSERT INTO requests (user_id, kind, title, detail, leave_type, place, doctor_note, start_date, end_date, days)
       VALUES (?, 'cuti', ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      user.id,
      LEAVE_LABEL[type],
      `${days} hari · mulai ${startDate}`,
      type,
      place ?? null,
      doctorNote ? 1 : null,
      startDate,
      endDate,
      days,
    );
  res.status(201).json({
    id: Number(result.lastInsertRowid),
    type,
    days,
    startDate,
    endDate,
    status: "Menunggu",
    ...(type === "tahunan" ? { balanceAfterApproval: user.leave_balance - days } : {}),
  });
});

// ── Dinas — Jabodetabek perimeter + allowance injection ──────────
const dinasSchema = z.object({
  dest: z.string().trim().min(2),
  departDate: dateSchema,
  overnight: z.boolean().optional(),
  nights: z.number().int().min(1).max(DINAS_MAX_NIGHTS).optional(),
});

requestsRouter.post("/dinas", (req, res) => {
  const body = dinasSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data dinas tidak valid.", issues: body.error.issues });
    return;
  }
  const { dest, departDate } = body.data;
  if (!DINAS_DESTINATIONS.includes(dest)) {
    res.status(422).json({ error: "Tujuan tidak dikenal.", destinations: DINAS_DESTINATIONS });
    return;
  }
  const jabodetabek = isJabodetabek(dest);
  // Inside the Jabodetabek perimeter: same-day trip, no allowance.
  const overnight = jabodetabek ? false : (body.data.overnight ?? false);
  const nights = overnight ? (body.data.nights ?? 1) : 0;
  const allowance = jabodetabek
    ? { transport: 0, meals: 0, lodging: 0, total: 0 }
    : dinasAllowance(overnight, nights);

  const ret = new Date(departDate + "T00:00:00");
  ret.setDate(ret.getDate() + nights);
  const returnDate = dateStr(ret);

  const detail = jabodetabek
    ? "1 hari · dalam Jabodetabek"
    : overnight
      ? `${nights} mlm · ${fmtIDR(allowance.total)}`
      : `1 hari · ${fmtIDR(allowance.total)}`;
  const result = db
    .prepare(
      `INSERT INTO requests (user_id, kind, title, detail, start_date, end_date, dest, overnight, nights, amount)
       VALUES (?, 'dinas', ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      req.user!.id,
      `Dinas — ${dest}`,
      detail,
      departDate,
      returnDate,
      dest,
      overnight ? 1 : 0,
      nights,
      allowance.total,
    );
  res.status(201).json({
    id: Number(result.lastInsertRowid),
    dest,
    jabodetabek,
    departDate,
    returnDate,
    nights,
    allowance,
    status: "Menunggu",
  });
});

// ── Lembur — daily/weekly caps, 1/173 tariff ─────────────────────
const lemburSchema = z.object({
  date: dateSchema,
  hours: z
    .number()
    .min(LEMBUR_STEP_H)
    .max(LEMBUR_MAX_H)
    .refine((h) => Number.isInteger(h / LEMBUR_STEP_H), `Kelipatan ${LEMBUR_STEP_H} jam`),
});

requestsRouter.post("/lembur", (req, res) => {
  const body = lemburSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data lembur tidak valid.", issues: body.error.issues });
    return;
  }
  const { date, hours } = body.data;
  if (hours > LEMBUR_DAILY_CAP_H) {
    res.status(422).json({
      error: `Melebihi cap harian ${LEMBUR_DAILY_CAP_H} jam.`,
      payableHours: LEMBUR_DAILY_CAP_H,
      nonPayableHours: +(hours - LEMBUR_DAILY_CAP_H).toFixed(1),
    });
    return;
  }
  const existingDay = db
    .prepare(
      `SELECT COALESCE(SUM(hours), 0) AS h FROM requests
       WHERE user_id = ? AND kind = 'lembur' AND status != 'Ditolak' AND start_date = ?`,
    )
    .get(req.user!.id, date) as { h: number };
  if (existingDay.h + hours > LEMBUR_DAILY_CAP_H) {
    res.status(422).json({
      error: `Total lembur tanggal itu melebihi cap harian ${LEMBUR_DAILY_CAP_H} jam (sudah ${fmtHours(existingDay.h)} jam).`,
      usedHours: existingDay.h,
    });
    return;
  }
  const week = db
    .prepare(
      `SELECT COALESCE(SUM(hours), 0) AS h FROM requests
       WHERE user_id = ? AND kind = 'lembur' AND status != 'Ditolak'
         AND start_date BETWEEN ? AND ?`,
    )
    .get(req.user!.id, weekStart(date), weekEnd(date)) as { h: number };
  if (week.h + hours > LEMBUR_WEEKLY_CAP_H) {
    res.status(422).json({
      error: `Melebihi kuota mingguan ${LEMBUR_WEEKLY_CAP_H} jam (terpakai ${fmtHours(week.h)} jam).`,
      weeklyUsedHours: week.h,
      weeklyCapHours: LEMBUR_WEEKLY_CAP_H,
    });
    return;
  }

  const weekday = new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" });
  const result = db
    .prepare(
      `INSERT INTO requests (user_id, kind, title, detail, start_date, hours)
       VALUES (?, 'lembur', ?, ?, ?, ?)`,
    )
    .run(req.user!.id, `Lembur — ${weekday}`, `${fmtHours(hours)} jam`, date, hours);
  res.status(201).json({
    id: Number(result.lastInsertRowid),
    date,
    hours,
    tariff: LEMBUR_TARIFF,
    weeklyRemainingHours: +(LEMBUR_WEEKLY_CAP_H - week.h - hours).toFixed(1),
    status: "Menunggu",
  });
});

// Approving an annual-leave request deducts the balance — exported for the
// admin router.
export function approveRequest(r: RequestRow) {
  db.prepare("UPDATE requests SET status = 'Disetujui' WHERE id = ?").run(r.id);
  if (r.kind === "cuti" && r.leave_type === "tahunan" && r.days) {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(r.user_id) as unknown as UserRow;
    db.prepare("UPDATE users SET leave_balance = MAX(0, ?) WHERE id = ?").run(
      user.leave_balance - r.days,
      r.user_id,
    );
  }
}
