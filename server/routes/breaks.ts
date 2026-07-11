import { Router } from "express";
import { sql, type BreakRow } from "../db.js";
import { requireEmployee } from "../middleware.js";
import { checkLocation, rejectLocation, locationSchema, type LocationCheck } from "../geo.js";
import { dateStr, canTakeBreak } from "../rules.js";

// Istirahat (break) clock in/out — one per day, non-Sopir positions only.
// Both ends are geofence-gated exactly like work check-in/out: the employee
// taps while physically at church, then is free to step out until the next tap.
export const breaksRouter = Router();
breaksRouter.use(requireEmployee);

function publicBreak(r: BreakRow) {
  return { breakStart: r.break_start, breakEnd: r.break_end };
}

breaksRouter.get("/today", async (req, res) => {
  const user = req.user!;
  const today = dateStr();
  const [row] = await sql<BreakRow[]>`
    SELECT * FROM breaks WHERE user_id = ${user.id} AND date = ${today}
  `;
  res.json({ date: today, break: row ? publicBreak(row) : null, allowed: canTakeBreak(user.position) });
});

breaksRouter.post("/start", async (req, res) => {
  const user = req.user!;
  if (!canTakeBreak(user.position)) {
    res.status(403).json({ error: "Fitur istirahat tidak berlaku untuk posisi Sopir." });
    return;
  }
  const body = locationSchema.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Koordinat tidak valid." });
    return;
  }
  const today = dateStr();
  const [openWork] = await sql<{ id: number }[]>`
    SELECT id FROM attendance WHERE user_id = ${user.id} AND date = ${today} AND check_out IS NULL LIMIT 1
  `;
  if (!openWork) {
    res.status(409).json({ error: "Mulai presensi masuk terlebih dahulu sebelum istirahat." });
    return;
  }
  const [existing] = await sql<BreakRow[]>`
    SELECT id FROM breaks WHERE user_id = ${user.id} AND date = ${today}
  `;
  if (existing) {
    res.status(409).json({ error: "Istirahat hari ini sudah tercatat." });
    return;
  }

  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  await sql`
    INSERT INTO breaks (user_id, date, break_start, distance_m)
    VALUES (${user.id}, ${today}, ${now}, ${distanceM})
  `;
  res.status(201).json({ breakStart: now.toISOString(), breakEnd: null, distanceM });
});

breaksRouter.post("/end", async (req, res) => {
  const user = req.user!;
  const body = locationSchema.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Koordinat tidak valid." });
    return;
  }
  const today = dateStr();
  const [open] = await sql<BreakRow[]>`
    SELECT * FROM breaks WHERE user_id = ${user.id} AND date = ${today} AND break_end IS NULL
  `;
  if (!open) {
    res.status(409).json({ error: "Belum mulai istirahat hari ini." });
    return;
  }

  const loc = checkLocation(body.data);
  if (rejectLocation(res, loc)) return;
  const { distanceM } = loc as Extract<LocationCheck, { kind: "in-range" }>;

  const now = new Date();
  await sql`UPDATE breaks SET break_end = ${now}, distance_m = ${distanceM} WHERE id = ${open.id}`;
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(open.break_start).getTime()) / 60000));
  res.json({ breakStart: open.break_start, breakEnd: now.toISOString(), minutes, distanceM });
});
