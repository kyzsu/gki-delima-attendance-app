import { Router } from "express";
import { sql, type AttendanceRow, type BreakRow } from "../db.js";
import { requireAuth, requireEmployee } from "../middleware.js";
import { decodeDataUrl, loadPhoto, savePhoto } from "../photos.js";
import { checkLocation, rejectLocation, locationSchema, type LocationCheck } from "../geo.js";
import { dateStr, minutesOfDay, shiftsFor, toMinutes, workedMinutes } from "../rules.js";
import { holidayName } from "../holidays.js";

export const attendanceRouter = Router();
attendanceRouter.use(requireEmployee);

function publicSession(r: AttendanceRow) {
  return {
    date: r.date,
    shift: r.shift,
    checkIn: r.check_in,
    checkOut: r.check_out,
    late: r.late,
    earlyOut: r.early_out,
    special: r.special,
    workedMinutes: r.worked_minutes,
  };
}

attendanceRouter.post("/check-in", async (req, res) => {
  const body = locationSchema.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Koordinat tidak valid." });
    return;
  }
  const user = req.user!;
  const today = dateStr();
  const sessions = await sql<AttendanceRow[]>`
    SELECT * FROM attendance WHERE user_id = ${user.id} AND date = ${today} ORDER BY shift
  `;
  const open = sessions.find((s) => !s.check_out);
  if (open) {
    res.status(409).json({ error: "Sudah check-in — selesaikan presensi pulang dahulu.", checkIn: open.check_in });
    return;
  }

  // Pasal 5 ayat (1)–(3): the position's schedule decides today's sessions.
  // No clock-in on off-days (Senin) or national holidays, or after the
  // final shift has ended.
  const shifts = shiftsFor(user.position, today);
  const holiday = await holidayName(today);
  if (shifts.length === 0 || holiday) {
    res.status(422).json({
      error: holiday ? `Hari libur nasional — ${holiday}.` : "Hari libur — tidak ada jadwal kerja hari ini.",
      reason: "day-off",
    });
    return;
  }
  const shiftIdx = sessions.length;
  if (shiftIdx >= shifts.length) {
    res.status(409).json({ error: "Semua sesi kerja hari ini sudah tercatat." });
    return;
  }
  const lastEnd = shifts[shifts.length - 1]!.end;
  if (minutesOfDay(new Date()) > toMinutes(lastEnd)) {
    res.status(422).json({
      error: `Di luar jam kerja — shift berakhir pukul ${lastEnd.replace(":", ".")}.`,
      reason: "after-hours",
    });
    return;
  }

  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  const late = minutesOfDay(now) > toMinutes(shifts[shiftIdx]!.start);
  const [created] = await sql<{ id: number }[]>`
    INSERT INTO attendance (user_id, date, shift, check_in, late, special, distance_m)
    VALUES (${user.id}, ${today}, ${shiftIdx}, ${now}, ${late}, ${false}, ${distanceM})
    RETURNING id
  `;
  const photo = body.data.photo ? decodeDataUrl(body.data.photo) : null;
  if (photo) await savePhoto(created!.id, "in", photo.mime, photo.data);
  res.status(201).json({
    checkIn: now.toISOString(),
    shift: shiftIdx,
    shiftStart: shifts[shiftIdx]!.start,
    late,
    special: false,
    distanceM,
    photo: !!photo,
  });
});

attendanceRouter.post("/check-out", async (req, res) => {
  const body = locationSchema.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Koordinat tidak valid." });
    return;
  }
  const user = req.user!;
  const today = dateStr();
  const [open] = await sql<AttendanceRow[]>`
    SELECT * FROM attendance
    WHERE user_id = ${user.id} AND date = ${today} AND check_out IS NULL
    ORDER BY shift DESC LIMIT 1
  `;
  if (!open) {
    res.status(409).json({ error: "Belum check-in hari ini." });
    return;
  }
  // A break must be closed out before the day can be signed off.
  const [brk] = await sql<BreakRow[]>`
    SELECT * FROM breaks WHERE user_id = ${user.id} AND date = ${today}
  `;
  if (brk && !brk.break_end) {
    res.status(409).json({ error: "Selesaikan istirahat terlebih dahulu sebelum presensi pulang." });
    return;
  }

  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  const rawMin = Math.max(0, Math.round((now.getTime() - new Date(open.check_in).getTime()) / 60000));
  // Real istirahat duration replaces the ayat (4) flat 60-min assumption —
  // but only when the break falls fully inside *this* shift's window (a
  // Sunday Tata Usaha split shift can close out twice with one break logged
  // for the day; it's attributed to whichever session it actually happened in).
  let breakMinutes: number | null = null;
  if (brk?.break_end) {
    const bs = new Date(brk.break_start).getTime();
    const be = new Date(brk.break_end).getTime();
    const ci = new Date(open.check_in).getTime();
    if (bs >= ci && be <= now.getTime()) {
      breakMinutes = Math.max(0, Math.round((be - bs) / 60000));
    }
  }
  const netMin = workedMinutes(rawMin, user.position, breakMinutes);
  // Pulang cepat: out before the shift's scheduled end (n/a for tugas khusus).
  const shifts = shiftsFor(user.position, today);
  const shiftEnd = open.special ? null : shifts[open.shift]?.end;
  const earlyOut = shiftEnd ? minutesOfDay(now) < toMinutes(shiftEnd) : false;

  await sql`
    UPDATE attendance
    SET check_out = ${now}, early_out = ${earlyOut}, worked_minutes = ${netMin}, distance_m = ${distanceM}
    WHERE id = ${open.id}
  `;
  const photo = body.data.photo ? decodeDataUrl(body.data.photo) : null;
  if (photo) await savePhoto(open.id, "out", photo.mime, photo.data);
  res.json({
    checkIn: open.check_in,
    checkOut: now.toISOString(),
    shift: open.shift,
    workedMs: netMin * 60000,
    breakDeducted: netMin < rawMin,
    earlyOut,
    shiftEnd,
    distanceM,
    photo: !!photo,
  });
});

attendanceRouter.get("/today", async (req, res) => {
  const user = req.user!;
  const today = dateStr();
  const sessions = await sql<AttendanceRow[]>`
    SELECT * FROM attendance WHERE user_id = ${user.id} AND date = ${today} ORDER BY shift
  `;
  const shifts = shiftsFor(user.position, today);
  res.json({
    date: today,
    workday: shifts.length > 0,
    totalShifts: Math.max(shifts.length, 1),
    sessions: sessions.map(publicSession),
  });
});

// Selfie retrieval — the owner or an admin. Mounted at /api/photos.
export const photosRouter = Router();
photosRouter.get("/:attendanceId/:kind", requireAuth, async (req, res) => {
  const kind = req.params.kind;
  if (kind !== "in" && kind !== "out") {
    res.status(404).json({ error: "Foto tidak ditemukan." });
    return;
  }
  const row = await loadPhoto(Number(req.params.attendanceId) || 0, kind);
  if (!row) {
    res.status(404).json({ error: "Foto tidak ditemukan." });
    return;
  }
  if (req.user!.role !== "admin" && req.user!.id !== row.user_id) {
    res.status(403).json({ error: "Bukan presensi Anda." });
    return;
  }
  // Photos never change once stored.
  res.setHeader("Cache-Control", "private, max-age=86400, immutable");
  res.type(row.mime).send(row.data);
});

// Attendance log, newest first. Default: recent sessions (home screen);
// ?month=YYYY-MM returns that whole month (history screen).
attendanceRouter.get("/log", async (req, res) => {
  const month =
    typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : null;
  const rows = month
    ? await sql<AttendanceRow[]>`
        SELECT * FROM attendance WHERE user_id = ${req.user!.id}
          AND date LIKE ${month + "%"}
        ORDER BY date DESC, shift DESC
      `
    : await sql<AttendanceRow[]>`
        SELECT * FROM attendance WHERE user_id = ${req.user!.id}
        ORDER BY date DESC, shift DESC LIMIT ${Math.min(Number(req.query.limit) || 30, 100)}
      `;
  res.json(rows.map(publicSession));
});
