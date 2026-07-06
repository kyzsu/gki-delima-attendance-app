// Check-in/out selfie storage. Currently Postgres bytea — at this scale
// (~70 KB JPEG × a handful of employees × 2/day) that's well within the
// free tier. To move to Supabase Storage later, only this module changes.
import { sql } from "./db.js";

const MAX_BYTES = 2 * 1024 * 1024;

export function decodeDataUrl(dataUrl: string): { mime: string; data: Buffer } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const data = Buffer.from(m[2]!, "base64");
  if (data.length === 0 || data.length > MAX_BYTES) return null;
  return { mime: m[1]!, data };
}

export async function savePhoto(
  attendanceId: number,
  kind: "in" | "out",
  mime: string,
  data: Buffer,
) {
  await sql`
    INSERT INTO attendance_photos (attendance_id, kind, mime, data)
    VALUES (${attendanceId}, ${kind}, ${mime}, ${data})
    ON CONFLICT (attendance_id, kind) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data
  `;
}

export async function loadPhoto(attendanceId: number, kind: "in" | "out") {
  const [row] = await sql<{ mime: string; data: Buffer; user_id: number }[]>`
    SELECT p.mime, p.data, a.user_id
    FROM attendance_photos p
    JOIN attendance a ON a.id = p.attendance_id
    WHERE p.attendance_id = ${attendanceId} AND p.kind = ${kind}
  `;
  return row;
}

// Request attachment (e.g. the doctor's letter photo for a sick leave).
export async function saveRequestAttachment(requestId: number, mime: string, data: Buffer) {
  await sql`
    INSERT INTO request_attachments (request_id, mime, data)
    VALUES (${requestId}, ${mime}, ${data})
    ON CONFLICT (request_id) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data
  `;
}

export async function loadRequestAttachment(requestId: number) {
  const [row] = await sql<{ mime: string; data: Buffer; user_id: number }[]>`
    SELECT ra.mime, ra.data, r.user_id
    FROM request_attachments ra
    JOIN requests r ON r.id = ra.request_id
    WHERE ra.request_id = ${requestId}
  `;
  return row;
}
