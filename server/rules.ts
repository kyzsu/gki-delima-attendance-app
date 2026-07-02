// Business rules shared by all routes — implements Pasal 5 ("Jam Kerja
// Karyawan") of the GKI Delima employee policy.

// ── Geofence ─────────────────────────────────────────────────────
// Jakarta placeholder — replace with the real GKI Delima coordinates
// before production (same caveat as src/app/store.tsx).
export const CHURCH = {
  name: "GKI Delima",
  address: "Jl. Delima IV No.5, RT.17/RW.5, Tj. Duren Sel., Kec. Grogol petamburan, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11470",
  lat: -6.174782661694437,
  lng: 106.78442308306923,
};
export const GEOFENCE_RADIUS_M = 50;

/** Demo mode: location checks resolve in-range without real GPS and
 *  pending signups auto-approve after AUTO_APPROVE_MS. Defaults to ON in
 *  development and OFF in production; override with GKI_DEMO_MODE=true/false. */
export const DEMO_MODE = process.env.GKI_DEMO_MODE
  ? process.env.GKI_DEMO_MODE !== "false"
  : process.env.NODE_ENV !== "production";
export const AUTO_APPROVE_MS = 4500;

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ── Time (church-local) ──────────────────────────────────────────
/** All business dates/times are evaluated in church-local time, regardless
 *  of the server's clock (cloud hosts run UTC). */
export const APP_TZ = "Asia/Jakarta";

/** Date in church-local time as YYYY-MM-DD (en-CA gives ISO order). */
export function dateStr(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(d);
}

/** Minutes since midnight (0–1439) in church-local time. */
export function minutesOfDay(d = new Date()) {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .split(":");
  return Number(h) * 60 + Number(m);
}

/** Pure calendar math on YYYY-MM-DD strings — noon UTC avoids DST/offset
 *  edge cases entirely. */
export function addDaysStr(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekday of a YYYY-MM-DD date (0 = Sunday … 6 = Saturday). */
export function weekdayOf(date: string) {
  return new Date(date + "T12:00:00Z").getUTCDay();
}

export function weekdayLong(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("id-ID", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/** Monday of the ISO week containing the given YYYY-MM-DD date. */
export function weekStart(date: string) {
  const day = (weekdayOf(date) + 6) % 7; // 0 = Monday
  return addDaysStr(date, -day);
}

export function weekEnd(date: string) {
  return addDaysStr(weekStart(date), 6);
}

// ── Work schedules — Pasal 5 ayat (1)–(3) ────────────────────────
// The work week is Selasa–Minggu; Senin is the weekly day off.
// Check-ins on off-days are recorded as "tugas khusus pelayanan gerejawi"
// (the exception ayat (2) and (3) carve out) and are never late.
export type Position = "tata_usaha" | "sopir" | "koster";

export const POSITION_LABEL: Record<Position, string> = {
  tata_usaha: "Tata Usaha",
  sopir: "Sopir",
  koster: "Koster & Pembantu Koster",
};

export interface Shift {
  start: string; // "HH:MM" church-local
  end: string;
}

const sh = (start: string, end: string): Shift => ({ start, end });

/** Shifts per weekday (0 = Sunday … 6 = Saturday); absent = day off. */
export const SCHEDULES: Record<Position, Partial<Record<number, Shift[]>>> = {
  tata_usaha: {
    2: [sh("08:30", "17:00")], // Selasa
    3: [sh("08:30", "17:00")],
    4: [sh("08:30", "17:00")],
    5: [sh("08:30", "17:00")], // Jumat
    6: [sh("08:30", "13:00")], // Sabtu
    0: [sh("06:00", "13:00"), sh("15:30", "20:30")], // Minggu — two shifts
  },
  sopir: {
    2: [sh("08:30", "17:00")],
    3: [sh("08:30", "17:00")],
    4: [sh("08:30", "17:00")],
    5: [sh("08:30", "17:00")],
    6: [sh("08:30", "13:00")],
    0: [sh("06:00", "13:00")],
  },
  koster: {
    2: [sh("08:30", "21:00")],
    3: [sh("08:30", "21:00")],
    4: [sh("08:30", "21:00")],
    5: [sh("08:30", "21:00")],
    6: [sh("05:30", "17:00")],
    0: [sh("05:00", "19:00")],
  },
};

export function shiftsFor(position: Position, date: string): Shift[] {
  return SCHEDULES[position][weekdayOf(date)] ?? [];
}

export const toMinutes = (hm: string) => {
  const [h, m] = hm.split(":");
  return Number(h) * 60 + Number(m);
};

// ── Breaks & worked time — Pasal 5 ayat (4) ──────────────────────
// After 4 consecutive worked hours, 1 hour of break — except Sopir, whose
// break follows the assignment.
export const BREAK_AFTER_MIN = 4 * 60;
export const BREAK_MIN = 60;

export function workedMinutes(rawMinutes: number, position: Position) {
  if (position !== "sopir" && rawMinutes > BREAK_AFTER_MIN) {
    return Math.max(0, rawMinutes - BREAK_MIN);
  }
  return rawMinutes;
}

// ── Leave (cuti & izin) — Pasal 5 ayat (5)–(7) ───────────────────────────
export type LeaveType =
  | "tahunan"
  | "sakit" // (5a) — without surat dokter it cuts the annual balance
  | "izin" // (6)+(7) discretionary izin — always cuts the annual balance
  | "duka_inti" // (5i) anak / suami / istri meninggal
  | "duka_ortu" // (5j) orangtua / mertua meninggal
  | "menikah" // (5b)
  | "menikahkan_anak" // (5c)
  | "baptis_khitan" // (5d)
  | "istri_melahirkan" // (5e)
  | "melahirkan"; // (5f) — per ketentuan cuti hamil/melahirkan

export const LEAVE_LABEL: Record<LeaveType, string> = {
  tahunan: "Cuti Tahunan",
  sakit: "Cuti Sakit",
  izin: "Izin (dipotong cuti)",
  duka_inti: "Duka — Anak/Pasangan",
  duka_ortu: "Duka — Orangtua/Mertua",
  menikah: "Menikah",
  menikahkan_anak: "Menikahkan Anak",
  baptis_khitan: "Baptis/Khitan Anak",
  istri_melahirkan: "Istri Melahirkan",
  melahirkan: "Cuti Melahirkan",
};

/** Fixed entitlements in working days (null = variable). */
export const LEAVE_FIXED_DAYS: Partial<Record<LeaveType, number>> = {
  izin: 1,
  duka_inti: 2,
  menikah: 2,
  menikahkan_anak: 2,
  baptis_khitan: 1,
  istri_melahirkan: 1,
};

export const DEFAULT_LEAVE_BALANCE = 12;
export const IZIN_MAX_PER_MONTH = 1;
export const IZIN_MAX_PER_YEAR = 3;
export const DUKA_ORTU_MAX_DAYS = { inCity: 2, outside: 4 } as const;
export const MELAHIRKAN_MAX_DAYS = 90;

/** Leave types that deduct the annual balance (sakit only without a
 *  doctor's note — ayat 5a; izin always — ayat 6's "izin dipotong cuti"). */
export function leaveCutsBalance(type: LeaveType, doctorNote: boolean | null | undefined) {
  return type === "tahunan" || type === "izin" || (type === "sakit" && !doctorNote);
}

// ── Trip / business travel ───────────────────────────────────────
export const JABODETABEK = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi"];
export const TRIP_DESTINATIONS = [
  ...JABODETABEK,
  "Bandung",
  "Semarang",
  "Surabaya",
  "Medan",
];
export const TRIP_RATES = { meal: 75_000, transport: 150_000, lodging: 350_000 };
export const TRIP_MAX_NIGHTS = 7;

export function isJabodetabek(dest: string) {
  return JABODETABEK.includes(dest);
}

/** Allowance injection for trips outside Jabodetabek (mirrors trip.tsx). */
export function tripAllowance(overnight: boolean, nights: number) {
  const transport = TRIP_RATES.transport * (overnight ? 2 : 1);
  const meals = overnight ? TRIP_RATES.meal * (nights + 1) : TRIP_RATES.meal;
  const lodging = overnight ? TRIP_RATES.lodging * nights : 0;
  return { transport, meals, lodging, total: transport + meals + lodging };
}

// ── Overtime ──────────────────────────────────────────────────────
export const OVERTIME_DAILY_CAP_H = 3;
export const OVERTIME_WEEKLY_CAP_H = 14;
export const OVERTIME_STEP_H = 0.5;
export const OVERTIME_MAX_H = 8;
export const OVERTIME_TARIFF = "1/173 gaji pokok";

// ── Formatting ───────────────────────────────────────────────────
export const fmtIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");

export const fmtHours = (h: number) =>
  h.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
