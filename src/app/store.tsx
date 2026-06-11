import * as React from "react";
import {
  api,
  ApiError,
  clearToken,
  getToken,
  setToken,
  type ApiConfig,
  type ApiRequest,
  type ApiToday,
  type ApiUser,
  type Coords,
} from "@/lib/api";

// ── Geofence configuration ───────────────────────────────────────
// Display fallback; the live values come from GET /api/config
// (set GKI_DEMO_MODE=false on the server to require real GPS).
export const CHURCH = {
  name: "GKI Delima",
  address: "Jl. Delima IV No.5, RT.17/RW.5, Tj. Duren Sel., Kec. Grogol petamburan, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11470",
  lat: -6.174782661694437,
  lng: 106.78442308306923,
};
export const GEOFENCE_RADIUS_M = 50;

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
  | ({ kind: "in-range"; distanceM: number } & Coords)
  | ({ kind: "out-of-range"; distanceM: number } & Coords)
  | { kind: "gps-off" };

let configCache: Promise<ApiConfig> | null = null;
function getConfig() {
  configCache ??= api.config().catch(() => {
    configCache = null;
    return { church: CHURCH, geofenceRadiusM: GEOFENCE_RADIUS_M, demoMode: true };
  });
  return configCache;
}

/** Pre-flight location check for the locating screen. The server re-validates
 *  the geofence on check-in/out; in demo mode it resolves in-range without GPS.
 *  Override per-visit with ?force=far or ?force=gpsoff on the check-in route. */
export async function checkLocation(force?: string | null): Promise<LocationResult> {
  if (force === "far") return { kind: "out-of-range", distanceM: 1200 };
  if (force === "gpsoff") return { kind: "gps-off" };
  const cfg = await getConfig();

  // Demo mode never *rejects*, but it still measures: real coordinates are
  // captured and recorded when GPS is available, so distances are honest.
  if (cfg.demoMode) {
    if (!("geolocation" in navigator)) return { kind: "in-range", distanceM: 18 };
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const d = Math.round(haversineM(lat, lng, cfg.church.lat, cfg.church.lng));
          resolve({ kind: "in-range", distanceM: d, lat, lng });
        },
        () => resolve({ kind: "in-range", distanceM: 18 }),
        { enableHighAccuracy: true, timeout: 5000 },
      );
    });
  }

  if (!("geolocation" in navigator)) return { kind: "gps-off" };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const d = Math.round(haversineM(lat, lng, cfg.church.lat, cfg.church.lng));
        resolve(
          d <= cfg.geofenceRadiusM
            ? { kind: "in-range", distanceM: d, lat, lng }
            : { kind: "out-of-range", distanceM: d, lat, lng },
        );
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

/** Local date as YYYY-MM-DD (API date format). */
export function dateStr(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ── Store ────────────────────────────────────────────────────────
export interface LogEntry {
  d: string;
  in: string;
  out: string;
  late?: boolean;
  earlyOut?: boolean;
  special?: boolean;
}

export type RequestRecord = ApiRequest;

interface AppState {
  /** False until the session bootstrap (token → /auth/me) finishes. */
  ready: boolean;
  authed: boolean;
  user: {
    name: string;
    initials: string;
    email: string;
    role: "employee" | "admin";
    position: "tata_usaha" | "sopir" | "koster";
  };
  leaveBalance: number;

  attendance: "none" | "in" | "done";
  checkInAt: Date | null;
  checkOutAt: Date | null;
  lastDistanceM: number;
  setLastDistanceM: (n: number) => void;
  /** Coordinates captured on the locating screen, sent with check-in/out. */
  setPendingLoc: (loc: Coords) => void;
  log: LogEntry[];
  requests: RequestRecord[];

  login: (email: string, password: string) => Promise<ApiUser>;
  logout: () => void;
  checkIn: (photo?: string | null) => Promise<void>;
  checkOut: (photo?: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  submitCuti: typeof api.submitCuti;
  submitDinas: typeof api.submitDinas;
  submitLembur: typeof api.submitLembur;
}

const AppContext = React.createContext<AppState | null>(null);

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function logLabel(date: string) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === dateStr(today)) return "Hari ini";
  if (date === dateStr(yesterday)) return "Kemarin";
  return fmtDateShort(new Date(date + "T00:00:00"));
}

export function toLogEntry(e: {
  date: string;
  shift: number;
  checkIn: string;
  checkOut: string | null;
  late: boolean;
  earlyOut: boolean;
  special: boolean;
}): LogEntry {
  return {
    d: logLabel(e.date) + (e.shift > 0 ? ` · Sesi ${e.shift + 1}` : ""),
    in: fmtTime(new Date(e.checkIn)),
    out: e.checkOut ? fmtTime(new Date(e.checkOut)) : "—",
    late: e.late,
    earlyOut: e.earlyOut,
    special: e.special,
  };
}

const GUEST: ApiUser = {
  id: 0,
  name: "Karyawan",
  nip: "",
  email: "",
  phone: "",
  role: "employee",
  position: "tata_usaha",
  status: "approved",
  leaveBalance: 0,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Without a stored token there is no session to restore — ready immediately.
  const [ready, setReady] = React.useState(() => !getToken());
  const [authed, setAuthed] = React.useState(false);
  const [apiUser, setApiUser] = React.useState<ApiUser>(GUEST);
  const [today, setToday] = React.useState<ApiToday | null>(null);
  const [todayDone, setTodayDone] = React.useState(false);
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [requests, setRequests] = React.useState<RequestRecord[]>([]);
  const [lastDistanceM, setLastDistanceM] = React.useState(18);
  const pendingLoc = React.useRef<Coords>({});

  const loadSession = React.useCallback(async () => {
    const me = await api.me();
    setApiUser(me.user);
    setToday(me.today);
    setTodayDone(me.todayDone);
    if (me.user.role === "employee") {
      // Attendance and request endpoints are employee-only.
      const [logRows, reqRows] = await Promise.all([api.attendanceLog(), api.requests()]);
      setLog(logRows.map(toLogEntry));
      setRequests(reqRows);
    } else {
      setLog([]);
      setRequests([]);
    }
    setAuthed(true);
  }, []);

  React.useEffect(() => {
    if (!getToken()) return;
    // False positive: every setState in loadSession happens after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSession()
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) clearToken();
      })
      .finally(() => setReady(true));
  }, [loadSession]);

  const value: AppState = {
    ready,
    authed,
    user: {
      name: apiUser.name,
      initials: initials(apiUser.name),
      email: apiUser.email,
      role: apiUser.role,
      position: apiUser.position,
    },
    leaveBalance: apiUser.leaveBalance,

    // "in" while a session is open; "done" when every scheduled session is
    // recorded (Sunday Tata Usaha has two); otherwise check-in is available.
    attendance: today && !today.checkOut ? "in" : todayDone ? "done" : "none",
    checkInAt: today ? new Date(today.checkIn) : null,
    checkOutAt: today?.checkOut ? new Date(today.checkOut) : null,
    lastDistanceM,
    setLastDistanceM,
    setPendingLoc: (loc) => {
      pendingLoc.current = loc;
    },
    log,
    requests,

    login: async (email, password) => {
      const res = await api.login(email, password);
      setToken(res.token);
      await loadSession();
      return res.user;
    },
    logout: () => {
      clearToken();
      setAuthed(false);
      setApiUser(GUEST);
      setToday(null);
      setTodayDone(false);
      setLog([]);
      setRequests([]);
    },
    checkIn: async (photo) => {
      const res = await api.checkIn({ ...pendingLoc.current, photo: photo ?? undefined });
      setToday({
        checkIn: res.checkIn,
        checkOut: null,
        shift: res.shift,
        late: res.late,
        special: res.special,
        distanceM: res.distanceM,
      });
      setTodayDone(false);
      setLastDistanceM(res.distanceM);
      setLog((await api.attendanceLog()).map(toLogEntry));
    },
    checkOut: async (photo) => {
      const res = await api.checkOut({ ...pendingLoc.current, photo: photo ?? undefined });
      // Keep the closed session locally for the success screen; /me says
      // whether more shifts remain today (Sunday split shift).
      setToday((t) => (t ? { ...t, checkOut: res.checkOut } : t));
      setLastDistanceM(res.distanceM);
      const [me, logRows] = await Promise.all([api.me(), api.attendanceLog()]);
      setTodayDone(me.todayDone);
      setLog(logRows.map(toLogEntry));
    },
    refresh: loadSession,
    submitCuti: async (data) => {
      const res = await api.submitCuti(data);
      const [me, reqRows] = await Promise.all([api.me(), api.requests()]);
      setApiUser(me.user);
      setRequests(reqRows);
      return res;
    },
    submitDinas: async (data) => {
      const res = await api.submitDinas(data);
      setRequests(await api.requests());
      return res;
    },
    submitLembur: async (data) => {
      const res = await api.submitLembur(data);
      setRequests(await api.requests());
      return res;
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
