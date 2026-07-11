// Geofence check shared by attendance (check-in/out) and breaks
// (mulai/selesai istirahat) — both gate on the same 50 m radius.
import type { Response } from "express";
import { z } from "zod";
import { CHURCH, DEMO_MODE, GEOFENCE_RADIUS_M, haversineM } from "./rules.js";

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  // Demo-only testing hook, mirroring the frontend's ?force= params.
  force: z.enum(["far", "gpsoff"]).optional(),
  // Selfie captured by the face-scan screen (JPEG data URL). Unused by breaks.
  photo: z.string().max(3_000_000).optional(),
});

export type LocationCheck =
  | { kind: "in-range"; distanceM: number }
  | { kind: "out-of-range"; distanceM: number }
  | { kind: "gps-off" };

export function checkLocation(input: z.infer<typeof locationSchema>): LocationCheck {
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

export function rejectLocation(res: Response, loc: LocationCheck) {
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
