import { Router } from "express";
import { z } from "zod";
import { sql, type RequestRow, type UserRow } from "../db.js";
import { invalidateUser, requireAuth, requireEmployee } from "../middleware.js";
import { holidayName } from "../holidays.js";
import { decodeDataUrl, loadRequestAttachment, saveRequestAttachment } from "../photos.js";
import {
  TRIP_MAX_NIGHTS,
  weekdayOf,
  DUKA_ORTU_MAX_DAYS,
  IZIN_MAX_PER_MONTH,
  IZIN_MAX_PER_YEAR,
  LEAVE_FIXED_DAYS,
  LEAVE_LABEL,
  OVERTIME_DAILY_CAP_H,
  OVERTIME_MAX_H,
  OVERTIME_STEP_H,
  OVERTIME_TARIFF,
  OVERTIME_WEEKLY_CAP_H,
  MELAHIRKAN_MAX_DAYS,
  addDaysStr,
  tripAllowance,
  fmtHours,
  fmtIDR,
  isJabodetabek,
  leaveCutsBalance,
  weekdayLong,
  weekEnd,
  weekStart,
  type LeaveType,
} from "../rules.js";

export const requestsRouter = Router();
requestsRouter.use(requireEmployee);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD");

function publicRequest(r: RequestRow & { has_attachment?: boolean }) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    detail: r.detail,
    status: r.status,
    note: r.note,
    rejectReason: r.reject_reason,
    startDate: r.start_date,
    endDate: r.end_date,
    hasAttachment: r.has_attachment ?? false,
    createdAt: r.created_at,
  };
}

requestsRouter.get("/", async (req, res) => {
  const rows = await sql<(RequestRow & { has_attachment: boolean })[]>`
    SELECT r.*, EXISTS(SELECT 1 FROM request_attachments ra WHERE ra.request_id = r.id) AS has_attachment
    FROM requests r WHERE r.user_id = ${req.user!.id} ORDER BY r.id DESC
  `;
  res.json(rows.map(publicRequest));
});

/** Leave counts working days only — Senin (weekly day off) and national
 *  holidays inside the range are not deducted; the end date skips past them. */
async function leaveEndDate(start: string, workingDays: number): Promise<string> {
  let count = 0;
  let end = start;
  for (let i = 0; i < 366 && count < workingDays; i++) {
    const date = addDaysStr(start, i);
    if (weekdayOf(date) === 1) continue; // Senin libur
    if (await holidayName(date)) continue; // libur nasional
    count++;
    end = date;
  }
  return end;
}

// ── Cuti & izin — Pasal 5 ayat (5)–(7) ───────────────────────────
const leaveSchema = z.object({
  type: z.enum([
    "tahunan",
    "sakit",
    "izin",
    "duka_inti",
    "duka_ortu",
    "menikah",
    "menikahkan_anak",
    "baptis_khitan",
    "istri_melahirkan",
    "melahirkan",
  ]),
  startDate: dateSchema,
  days: z.number().int().min(1).optional(),
  place: z.enum(["inCity", "outside"]).optional(), // duka_ortu only
  doctorNote: z.boolean().optional(), // deprecated — kept for compatibility
  attachment: z.string().max(3_000_000).optional(), // sakit: doctor's letter photo (data URL)
});

requestsRouter.post("/leave", async (req, res) => {
  const body = leaveSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data cuti tidak valid.", issues: body.error.issues });
    return;
  }
  const user = req.user!;
  const { type, startDate, place } = body.data;
  const hasNote = type === "sakit" && !!body.data.attachment;
  let days = body.data.days ?? 1;

  // Fixed entitlements — ayat (5b)–(5e), (5i) and the 1-day izin (6)/(7).
  const fixed = LEAVE_FIXED_DAYS[type];
  if (fixed !== undefined) {
    if (body.data.days !== undefined && body.data.days > fixed) {
      res.status(422).json({
        error: `${LEAVE_LABEL[type]} maks ${fixed} hari kerja sesuai ketentuan.`,
        maxDays: fixed,
      });
      return;
    }
    days = body.data.days ?? fixed;
  }
  if (type === "duka_ortu") {
    // Ayat (5j): 2 hari dalam kota, sampai 4 hari di luar Jawa.
    if (!place) {
      res.status(400).json({ error: "Lokasi duka wajib dipilih." });
      return;
    }
    const max = DUKA_ORTU_MAX_DAYS[place];
    if (body.data.days === undefined) days = max;
    if (days > max) {
      res.status(422).json({
        error: `Duka orangtua/mertua ${place === "inCity" ? "dalam kota" : "luar Jawa"} maks ${max} hari.`,
        maxDays: max,
      });
      return;
    }
  }
  if (type === "melahirkan") {
    if (body.data.days === undefined) days = MELAHIRKAN_MAX_DAYS;
    if (days > MELAHIRKAN_MAX_DAYS) {
      res.status(422).json({ error: `Cuti melahirkan maks ${MELAHIRKAN_MAX_DAYS} hari.` });
      return;
    }
  }
  if (type === "izin") {
    // Ayat (7): 1 hari kerja, hanya sekali per bulan pelayanan dan
    // 3 kali per tahun pelayanan.
    const count = async (prefix: string) => {
      const [row] = await sql<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM requests
        WHERE user_id = ${user.id} AND leave_type = 'izin' AND status != 'Ditolak'
          AND start_date LIKE ${prefix + "%"}
      `;
      return row!.n;
    };
    if ((await count(startDate.slice(0, 7))) >= IZIN_MAX_PER_MONTH) {
      res.status(422).json({ error: `Izin hanya ${IZIN_MAX_PER_MONTH}× per bulan pelayanan.` });
      return;
    }
    const usedThisYear = await count(startDate.slice(0, 4));
    if (usedThisYear >= IZIN_MAX_PER_YEAR) {
      res.status(422).json({
        error: `Kuota izin tahun ini habis (${usedThisYear}/${IZIN_MAX_PER_YEAR}).`,
        used: usedThisYear,
      });
      return;
    }
  }

  // Ayat (6): only izin and annual leave deduct the balance.
  const cutsBalance = leaveCutsBalance(type);
  if (cutsBalance && days > user.leave_balance) {
    res.status(422).json({
      error: `Saldo cuti tahunan tidak cukup (sisa ${user.leave_balance} hari).`,
      leaveBalance: user.leave_balance,
    });
    return;
  }

  // Working days only — Senin and national holidays don't consume the leave.
  const endDate = await leaveEndDate(startDate, days);
  const detail =
    type === "sakit"
      ? `${days} hari · ${hasNote ? "surat dokter terlampir" : "tanpa surat"}`
      : type === "izin"
        ? `${days} hari · dipotong cuti`
        : `${days} hari · mulai ${startDate}`;
  const [created] = await sql<{ id: number }[]>`
    INSERT INTO requests (user_id, kind, title, detail, leave_type, place, doctor_note, start_date, end_date, days)
    VALUES (${user.id}, 'cuti', ${LEAVE_LABEL[type]}, ${detail}, ${type}, ${place ?? null},
            ${hasNote}, ${startDate}, ${endDate}, ${days})
    RETURNING id
  `;
  if (hasNote && body.data.attachment) {
    const decoded = decodeDataUrl(body.data.attachment);
    if (decoded) await saveRequestAttachment(created!.id, decoded.mime, decoded.data);
  }
  res.status(201).json({
    id: created!.id,
    type,
    days,
    startDate,
    endDate,
    status: "Menunggu",
    ...(cutsBalance ? { balanceAfterApproval: user.leave_balance - days } : {}),
  });
});

// ── Dinas — Jabodetabek perimeter + allowance injection ──────────
const tripSchema = z.object({
  dest: z.string().trim().min(2),
  departDate: dateSchema,
  overnight: z.boolean().optional(),
  nights: z.number().int().min(1).max(TRIP_MAX_NIGHTS).optional(),
  note: z.string().trim().max(500).optional(), // keterangan / trip purpose
});

requestsRouter.post("/trip", async (req, res) => {
  const body = tripSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data dinas tidak valid.", issues: body.error.issues });
    return;
  }
  const { dest, departDate } = body.data;
  // Destination is free text; the Jabodetabek perimeter is matched by name.
  const jabodetabek = isJabodetabek(dest);
  // Inside the Jabodetabek perimeter: same-day trip, no allowance.
  const overnight = jabodetabek ? false : (body.data.overnight ?? false);
  const nights = overnight ? (body.data.nights ?? 1) : 0;
  const allowance = jabodetabek
    ? { transport: 0, meals: 0, lodging: 0, total: 0 }
    : tripAllowance(overnight, nights);
  const returnDate = addDaysStr(departDate, nights);

  const detail = jabodetabek
    ? "1 hari · dalam Jabodetabek"
    : overnight
      ? `${nights} mlm · ${fmtIDR(allowance.total)}`
      : `1 hari · ${fmtIDR(allowance.total)}`;
  const [created] = await sql<{ id: number }[]>`
    INSERT INTO requests (user_id, kind, title, detail, start_date, end_date, dest, overnight, nights, amount, note)
    VALUES (${req.user!.id}, 'dinas', ${`Dinas — ${dest}`}, ${detail}, ${departDate},
            ${returnDate}, ${dest}, ${overnight}, ${nights}, ${allowance.total}, ${body.data.note ?? null})
    RETURNING id
  `;
  res.status(201).json({
    id: created!.id,
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
const overtimeSchema = z.object({
  date: dateSchema,
  hours: z
    .number()
    .min(OVERTIME_STEP_H)
    .max(OVERTIME_MAX_H)
    .refine((h) => Number.isInteger(h / OVERTIME_STEP_H), `Kelipatan ${OVERTIME_STEP_H} jam`),
  note: z.string().trim().max(500).optional(), // keterangan / alasan lembur
});

requestsRouter.post("/overtime", async (req, res) => {
  const body = overtimeSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Data lembur tidak valid.", issues: body.error.issues });
    return;
  }
  const { date, hours } = body.data;
  if (hours > OVERTIME_DAILY_CAP_H) {
    res.status(422).json({
      error: `Melebihi cap harian ${OVERTIME_DAILY_CAP_H} jam.`,
      payableHours: OVERTIME_DAILY_CAP_H,
      nonPayableHours: +(hours - OVERTIME_DAILY_CAP_H).toFixed(1),
    });
    return;
  }
  const [existingDay] = await sql<{ h: number }[]>`
    SELECT COALESCE(SUM(hours), 0)::float8 AS h FROM requests
    WHERE user_id = ${req.user!.id} AND kind = 'lembur' AND status != 'Ditolak'
      AND start_date = ${date}
  `;
  if (existingDay!.h + hours > OVERTIME_DAILY_CAP_H) {
    res.status(422).json({
      error: `Total lembur tanggal itu melebihi cap harian ${OVERTIME_DAILY_CAP_H} jam (sudah ${fmtHours(existingDay!.h)} jam).`,
      usedHours: existingDay!.h,
    });
    return;
  }
  const [week] = await sql<{ h: number }[]>`
    SELECT COALESCE(SUM(hours), 0)::float8 AS h FROM requests
    WHERE user_id = ${req.user!.id} AND kind = 'lembur' AND status != 'Ditolak'
      AND start_date BETWEEN ${weekStart(date)} AND ${weekEnd(date)}
  `;
  if (week!.h + hours > OVERTIME_WEEKLY_CAP_H) {
    res.status(422).json({
      error: `Melebihi kuota mingguan ${OVERTIME_WEEKLY_CAP_H} jam (terpakai ${fmtHours(week!.h)} jam).`,
      weeklyUsedHours: week!.h,
      weeklyCapHours: OVERTIME_WEEKLY_CAP_H,
    });
    return;
  }

  const [created] = await sql<{ id: number }[]>`
    INSERT INTO requests (user_id, kind, title, detail, start_date, hours, note)
    VALUES (${req.user!.id}, 'lembur', ${`Lembur — ${weekdayLong(date)}`},
            ${`${fmtHours(hours)} jam`}, ${date}, ${hours}, ${body.data.note ?? null})
    RETURNING id
  `;
  res.status(201).json({
    id: created!.id,
    date,
    hours,
    tariff: OVERTIME_TARIFF,
    weeklyRemainingHours: +(OVERTIME_WEEKLY_CAP_H - week!.h - hours).toFixed(1),
    status: "Menunggu",
  });
});

// Approving an annual-leave request deducts the balance — exported for the
// admin router.
export async function approveRequest(r: RequestRow) {
  await sql`UPDATE requests SET status = 'Disetujui' WHERE id = ${r.id}`;
  const cutsBalance =
    r.leave_type !== null && leaveCutsBalance(r.leave_type as LeaveType, r.doctor_note);
  if (r.kind === "cuti" && cutsBalance && r.days) {
    const [user] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${r.user_id}`;
    await sql`
      UPDATE users SET leave_balance = GREATEST(0, ${user!.leave_balance - r.days})
      WHERE id = ${r.user_id}
    `;
    invalidateUser(r.user_id);
  }
}

// Doctor's-letter attachment for a request — owner or admin. Mounted at
// /api/request-attachments.
export const requestAttachmentRouter = Router();
requestAttachmentRouter.get("/:id", requireAuth, async (req, res) => {
  const row = await loadRequestAttachment(Number(req.params.id) || 0);
  if (!row) {
    res.status(404).json({ error: "Lampiran tidak ditemukan." });
    return;
  }
  if (req.user!.role !== "admin" && req.user!.id !== row.user_id) {
    res.status(403).json({ error: "Bukan lampiran Anda." });
    return;
  }
  res.setHeader("Cache-Control", "private, max-age=86400, immutable");
  res.type(row.mime).send(row.data);
});
