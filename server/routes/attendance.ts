import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { db, type AttendanceRow } from "../db.ts";
import { requireAuth } from "../middleware.ts";
import {
  CHURCH,
  DEMO_MODE,
  GEOFENCE_RADIUS_M,
  LATE_HOUR,
  dateStr,
  haversineM,
} from "../rules.ts";

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

const locationSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  // Testing parity with the frontend's ?force=far / ?force=gpsoff params.
  force: z.enum(["far", "gpsoff"]).optional(),
});

type LocationCheck =
  | { kind: "in-range"; distanceM: number }
  | { kind: "out-of-range"; distanceM: number }
  | { kind: "gps-off" };

function checkLocation(input: z.infer<typeof locationSchema>): LocationCheck {
  if (input.force === "far") return { kind: "out-of-range", distanceM: 1200 };
  if (input.force === "gpsoff") return { kind: "gps-off" };
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

attendanceRouter.post("/check-in", (req, res) => {
  const body = locationSchema.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Koordinat tidak valid." });
    return;
  }
  const user = req.user!;
  const today = dateStr();
  const existing = db
    .prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?")
    .get(user.id, today) as AttendanceRow | undefined;
  if (existing) {
    res.status(409).json({ error: "Sudah check-in hari ini.", checkIn: existing.check_in });
    return;
  }
  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  const late = now.getHours() >= LATE_HOUR ? 1 : 0;
  db.prepare(
    "INSERT INTO attendance (user_id, date, check_in, late, distance_m) VALUES (?, ?, ?, ?, ?)",
  ).run(user.id, today, now.toISOString(), late, distanceM);
  res.status(201).json({ checkIn: now.toISOString(), late: !!late, distanceM });
});

attendanceRouter.post("/check-out", (req, res) => {
  const body = locationSchema.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Koordinat tidak valid." });
    return;
  }
  const user = req.user!;
  const today = db
    .prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?")
    .get(user.id, dateStr()) as AttendanceRow | undefined;
  if (!today) {
    res.status(409).json({ error: "Belum check-in hari ini." });
    return;
  }
  if (today.check_out) {
    res.status(409).json({ error: "Sudah check-out hari ini.", checkOut: today.check_out });
    return;
  }
  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  db.prepare("UPDATE attendance SET check_out = ?, distance_m = ? WHERE id = ?").run(
    now.toISOString(),
    distanceM,
    today.id,
  );
  const workedMs = now.getTime() - new Date(today.check_in).getTime();
  res.json({ checkIn: today.check_in, checkOut: now.toISOString(), workedMs, distanceM });
});

attendanceRouter.get("/today", (req, res) => {
  const row = db
    .prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?")
    .get(req.user!.id, dateStr()) as AttendanceRow | undefined;
  res.json(
    row
      ? { date: row.date, checkIn: row.check_in, checkOut: row.check_out, late: !!row.late }
      : null,
  );
});

// Attendance log for /home and /history, newest first.
attendanceRouter.get("/log", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const rows = db
    .prepare("SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT ?")
    .all(req.user!.id, limit) as unknown as AttendanceRow[];
  res.json(
    rows.map((r) => ({
      date: r.date,
      checkIn: r.check_in,
      checkOut: r.check_out,
      late: !!r.late,
    })),
  );
});
