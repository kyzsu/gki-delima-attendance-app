// Business rules shared by all routes — mirrors the constants documented in
// the README and previously hardcoded in the frontend screens.

// ── Geofence ─────────────────────────────────────────────────────
// Jakarta placeholder — replace with the real GKI Delima coordinates
// before production (same caveat as src/app/store.tsx).
export const CHURCH = {
  name: "GKI Delima",
  address: "GKI Delima · Jl. Delima Raya No. 1",
  lat: -6.1944,
  lng: 106.7892,
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

// ── Attendance ───────────────────────────────────────────────────
/** Check-ins at or after this hour are flagged late (matches store.tsx). */
export const LATE_HOUR = 8;

/** All business dates/times are evaluated in church-local time, regardless
 *  of the server's clock (cloud hosts run UTC). */
export const APP_TZ = "Asia/Jakarta";

// ── Cuti (leave) ─────────────────────────────────────────────────
export type LeaveType = "tahunan" | "sakit" | "darurat" | "duka";

export const LEAVE_LABEL: Record<LeaveType, string> = {
  tahunan: "Cuti Tahunan",
  sakit: "Cuti Sakit",
  darurat: "Cuti Darurat",
  duka: "Cuti Duka",
};

export const DEFAULT_LEAVE_BALANCE = 12;
export const DARURAT_MAX_DAYS = 1;
export const DARURAT_MAX_PER_MONTH = 1;
export const DARURAT_MAX_PER_YEAR = 3;
export const DUKA_MAX_DAYS = { inCity: 2, outside: 4 } as const;

// ── Dinas (business travel) ──────────────────────────────────────
export const JABODETABEK = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi"];
export const DINAS_DESTINATIONS = [
  ...JABODETABEK,
  "Bandung",
  "Semarang",
  "Surabaya",
  "Medan",
];
export const DINAS_RATES = { meal: 75_000, transport: 150_000, lodging: 350_000 };
export const DINAS_MAX_NIGHTS = 7;

export function isJabodetabek(dest: string) {
  return JABODETABEK.includes(dest);
}

/** Allowance injection for trips outside Jabodetabek (mirrors dinas.tsx). */
export function dinasAllowance(overnight: boolean, nights: number) {
  const transport = DINAS_RATES.transport * (overnight ? 2 : 1);
  const meals = overnight ? DINAS_RATES.meal * (nights + 1) : DINAS_RATES.meal;
  const lodging = overnight ? DINAS_RATES.lodging * nights : 0;
  return { transport, meals, lodging, total: transport + meals + lodging };
}

// ── Lembur (overtime) ────────────────────────────────────────────
export const LEMBUR_DAILY_CAP_H = 3;
export const LEMBUR_WEEKLY_CAP_H = 14;
export const LEMBUR_STEP_H = 0.5;
export const LEMBUR_MAX_H = 8;
export const LEMBUR_TARIFF = "1/173 gaji pokok";

// ── Formatting ───────────────────────────────────────────────────
export const fmtIDR = (n: number) => "Rp " + n.toLocaleString("id-ID");

export const fmtHours = (h: number) =>
  h.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Date in church-local time as YYYY-MM-DD (en-CA gives ISO order). */
export function dateStr(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(d);
}

/** Hour of day (0–23) in church-local time. */
export function hourOfDay(d = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, hour: "2-digit", hour12: false }).format(d),
  );
}

/** Pure calendar math on YYYY-MM-DD strings — noon UTC avoids DST/offset
 *  edge cases entirely. */
export function addDaysStr(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayLong(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("id-ID", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/** Monday of the ISO week containing the given YYYY-MM-DD date. */
export function weekStart(date: string) {
  const d = new Date(date + "T12:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDaysStr(date, -day);
}

export function weekEnd(date: string) {
  return addDaysStr(weekStart(date), 6);
}
