import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { sql, type AttendanceRow } from "../db.js";
import { requireEmployee } from "../middleware.js";
import {
  CHURCH,
  DEMO_MODE,
  GEOFENCE_RADIUS_M,
  dateStr,
  haversineM,
  minutesOfDay,
  shiftsFor,
  toMinutes,
  workedMinutes,
} from "../rules.js";

export const attendanceRouter = Router();
attendanceRouter.use(requireEmployee);

const locationSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  // Demo-only testing hook, mirroring the frontend's ?force= params.
  force: z.enum(["far", "gpsoff"]).optional(),
});

type LocationCheck =
  | { kind: "in-range"; distanceM: number }
  | { kind: "out-of-range"; distanceM: number }
  | { kind: "gps-off" };

function checkLocation(input: z.infer<typeof locationSchema>): LocationCheck {
  if (DEMO_MODE && input.force === "far") return { kind: "out-of-range", distanceM: 1200 };
  if (DEMO_MODE && input.force === "gpsoff") return { kind: "gps-off" };
  if (input.lat === undefined || input.lng === undefined) {
    return DEMO_MODE ? { kind: "in-range", distanceM: 18 } : { kind: "gps-off" };
  }
  const d = Math.round(haversineM(input.lat, input.lng, CHURCH.lat, CHURCH.lng));
  if (DEMO_MODE) return { kind: "in-range", distanceM: d };
  return d <= GEOFENCE_RADIUS_M
    ? { kind: "in-range", distanceM: d }
    : { kind: "out-of-range", distanceM: d };
}

function rejectLocation(res: Response, loc: LocationCheck) {
  if (loc.kind === "gps-off") {
    res.status(422).json({ error: "GPS tidak aktif.", reason: "gps-off" });
    return true;
  }
  if (loc.kind === "out-of-range") {
    res.status(422).json({
      error: `Di luar jangkauan — ${loc.distanceM} m dari ${CHURCH.name} (maks ${GEOFENCE_RADIUS_M} m).`,
      reason: "out-of-range",
      distanceM: loc.distanceM,
    });
    return true;
  }
  return false;
}

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

  // Pasal 5 ayat (1)–(3): the schedule for this employee's position decides
  // how many sessions today has. Off-days (Senin) are recorded as
  // "tugas khusus pelayanan gerejawi" — one session, never late.
  const shifts = shiftsFor(user.position, today);
  const special = shifts.length === 0;
  const shiftIdx = sessions.length;
  if (!special && shiftIdx >= shifts.length) {
    res.status(409).json({ error: "Semua sesi kerja hari ini sudah tercatat." });
    return;
  }
  if (special && sessions.length > 0) {
    res.status(409).json({ error: "Presensi tugas khusus hari ini sudah tercatat." });
    return;
  }

  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  const late = special ? false : minutesOfDay(now) > toMinutes(shifts[shiftIdx]!.start);
  await sql`
    INSERT INTO attendance (user_id, date, shift, check_in, late, special, distance_m)
    VALUES (${user.id}, ${today}, ${shiftIdx}, ${now}, ${late}, ${special}, ${distanceM})
  `;
  res.status(201).json({
    checkIn: now.toISOString(),
    shift: shiftIdx,
    shiftStart: special ? null : shifts[shiftIdx]!.start,
    late,
    special,
    distanceM,
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
  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  const rawMin = Math.max(0, Math.round((now.getTime() - new Date(open.check_in).getTime()) / 60000));
  // Pasal 5 ayat (4): 1 hour break after 4 consecutive hours (except Sopir).
  const netMin = workedMinutes(rawMin, user.position);
  // Pulang cepat: out before the shift's scheduled end (n/a for tugas khusus).
  const shifts = shiftsFor(user.position, today);
  const shiftEnd = open.special ? null : shifts[open.shift]?.end;
  const earlyOut = shiftEnd ? minutesOfDay(now) < toMinutes(shiftEnd) : false;

  await sql`
    UPDATE attendance
    SET check_out = ${now}, early_out = ${earlyOut}, worked_minutes = ${netMin}, distance_m = ${distanceM}
    WHERE id = ${open.id}
  `;
  res.json({
    checkIn: open.check_in,
    checkOut: now.toISOString(),
    shift: open.shift,
    workedMs: netMin * 60000,
    breakDeducted: netMin < rawMin,
    earlyOut,
    shiftEnd,
    distanceM,
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

// Attendance log for /home and /history, newest first.
attendanceRouter.get("/log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const rows = await sql<AttendanceRow[]>`
    SELECT * FROM attendance WHERE user_id = ${req.user!.id}
    ORDER BY date DESC, shift DESC LIMIT ${limit}
  `;
  res.json(rows.map(publicSession));
});
