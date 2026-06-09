import * as React from "react";

// ── Geofence configuration ───────────────────────────────────────
// Replace with the real GKI Delima coordinates before production.
export const CHURCH = {
  name: "GKI Delima",
  address: "GKI Delima · Jl. Delima Raya No. 1",
  lat: -6.1944,
  lng: 106.7892,
};
export const GEOFENCE_RADIUS_M = 50;

/** Demo mode: when true, location checks resolve in-range without real GPS.
 *  Override per-visit with ?force=far or ?force=gpsoff on the check-in route. */
export const DEMO_MODE = true;

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

export type LocationResult =
  | { kind: "in-range"; distanceM: number }
  | { kind: "out-of-range"; distanceM: number }
  | { kind: "gps-off" };

export function checkLocation(force?: string | null): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (force === "far") return resolve({ kind: "out-of-range", distanceM: 1200 });
    if (force === "gpsoff") return resolve({ kind: "gps-off" });
    if (DEMO_MODE) return resolve({ kind: "in-range", distanceM: 18 });

    if (!("geolocation" in navigator)) return resolve({ kind: "gps-off" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = haversineM(pos.coords.latitude, pos.coords.longitude, CHURCH.lat, CHURCH.lng);
        resolve(d <= GEOFENCE_RADIUS_M ? { kind: "in-range", distanceM: Math.round(d) } : { kind: "out-of-range", distanceM: Math.round(d) });
      },
      () => resolve({ kind: "gps-off" }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

// ── Formatting helpers ───────────────────────────────────────────
export const fmtTime = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");

export const fmtDateLong = (d: Date) =>
  d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const fmtDateShort = (d: Date) =>
  d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 11) return "Selamat pagi,";
  if (h < 15) return "Selamat siang,";
  if (h < 18) return "Selamat sore,";
  return "Selamat malam,";
}

export function fmtDuration(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}j ${String(m % 60).padStart(2, "0")}m`;
}

// ── Store ────────────────────────────────────────────────────────
export interface LogEntry {
  d: string;
  in: string;
  out: string;
  late?: boolean;
}

export interface RequestRecord {
  kind: "cuti" | "dinas" | "lembur";
  title: string;
  detail: string;
  status: "Menunggu" | "Disetujui";
}

interface AppState {
  user: { name: string; initials: string; email: string };
  setUserName: (name: string) => void;

  attendance: "none" | "in" | "done";
  checkInAt: Date | null;
  checkOutAt: Date | null;
  lastDistanceM: number;
  setLastDistanceM: (n: number) => void;
  checkIn: () => void;
  checkOut: () => void;
  log: LogEntry[];

  leaveBalance: number;
  requests: RequestRecord[];
  addRequest: (r: RequestRecord) => void;
}

const SEED_LOG: LogEntry[] = [
  { d: "Kemarin", in: "07.52", out: "16.05" },
  { d: "Sen, 8 Jun", in: "07.48", out: "16.12" },
  { d: "Jum, 5 Jun", in: "08.06", out: "16.01", late: true },
];

const SEED_REQUESTS: RequestRecord[] = [
  { kind: "dinas", title: "Dinas — Bandung", detail: "2 mlm · Rp 1.025.000", status: "Disetujui" },
  { kind: "lembur", title: "Lembur — Kamis", detail: "2 jam", status: "Menunggu" },
  { kind: "cuti", title: "Cuti Tahunan", detail: "1 hari · 10 Jun", status: "Disetujui" },
];

const AppContext = React.createContext<AppState | null>(null);

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = React.useState("Ruth Simanjuntak");
  const [attendance, setAttendance] = React.useState<AppState["attendance"]>("none");
  const [checkInAt, setCheckInAt] = React.useState<Date | null>(null);
  const [checkOutAt, setCheckOutAt] = React.useState<Date | null>(null);
  const [lastDistanceM, setLastDistanceM] = React.useState(18);
  const [log, setLog] = React.useState<LogEntry[]>(SEED_LOG);
  const [requests, setRequests] = React.useState<RequestRecord[]>(SEED_REQUESTS);

  const value: AppState = {
    user: { name, initials: initials(name), email: "ruth.simanjuntak@gkidelima.org" },
    setUserName: setName,
    attendance,
    checkInAt,
    checkOutAt,
    lastDistanceM,
    setLastDistanceM,
    checkIn: () => {
      setCheckInAt(new Date());
      setAttendance("in");
    },
    checkOut: () => {
      const out = new Date();
      setCheckOutAt(out);
      setAttendance("done");
      setLog((l) => [
        {
          d: "Hari ini",
          in: checkInAt ? fmtTime(checkInAt) : "—",
          out: fmtTime(out),
          late: checkInAt ? checkInAt.getHours() >= 8 : false,
        },
        ...l,
      ]);
    },
    log,
    leaveBalance: 7,
    requests,
    addRequest: (r) => setRequests((q) => [r, ...q]),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
