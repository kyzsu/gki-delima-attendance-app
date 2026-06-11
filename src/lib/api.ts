// Typed client for the GKI Delima API (server/). All paths go through the
// Vite dev proxy (`/api` → http://localhost:3001).

const TOKEN_KEY = "gki.token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init?.json !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

// ── Types (mirror the server responses) ──────────────────────────
export type Position = "tata_usaha" | "sopir" | "koster";

export type LeaveType =
  | "tahunan"
  | "sakit"
  | "izin"
  | "duka_inti"
  | "duka_ortu"
  | "menikah"
  | "menikahkan_anak"
  | "baptis_khitan"
  | "istri_melahirkan"
  | "melahirkan";

export interface ApiUser {
  id: number;
  name: string;
  nip: string;
  email: string;
  phone: string;
  role: "employee" | "admin";
  position: Position;
  status: "pending" | "approved" | "rejected";
  leaveBalance: number;
}

export interface ApiToday {
  checkIn: string;
  checkOut: string | null;
  shift: number;
  late: boolean;
  special: boolean;
  distanceM: number | null;
}

export interface ApiLogEntry {
  date: string; // YYYY-MM-DD
  shift: number;
  checkIn: string;
  checkOut: string | null;
  late: boolean;
  earlyOut: boolean;
  special: boolean;
  workedMinutes: number | null;
}

export interface ApiAbsence {
  date: string;
  userId: number;
  userName: string;
  position: string;
}

export interface ApiRequest {
  id: number;
  kind: "cuti" | "dinas" | "lembur";
  title: string;
  detail: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  createdAt: string;
}

export interface ApiConfig {
  church: { name: string; address: string; lat: number; lng: number };
  geofenceRadiusM: number;
  demoMode: boolean;
}

export interface AdminRequest extends ApiRequest {
  userName: string;
}

export interface Coords {
  lat?: number;
  lng?: number;
}

export const api = {
  config: () => request<ApiConfig>("/config"),

  signup: (data: { name: string; nip: string; email: string; phone: string; password: string; agreed: true }) =>
    request<{ id: number; status: string }>("/auth/signup", { method: "POST", json: data }),

  signupStatus: (id: number) =>
    request<{ id: number; status: "pending" | "approved" | "rejected" }>(`/auth/signup/${id}/status`),

  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>("/auth/login", { method: "POST", json: { email, password } }),

  me: () =>
    request<{
      user: ApiUser;
      today: ApiToday | null;
      todayDone: boolean;
      remainingShifts: number | null;
    }>("/auth/me"),

  checkIn: (loc: Coords & { photo?: string }) =>
    request<{
      checkIn: string;
      shift: number;
      shiftStart: string | null;
      late: boolean;
      special: boolean;
      distanceM: number;
      photo: boolean;
    }>("/attendance/check-in", { method: "POST", json: loc }),

  checkOut: (loc: Coords & { photo?: string }) =>
    request<{
      checkIn: string;
      checkOut: string;
      shift: number;
      workedMs: number;
      breakDeducted: boolean;
      earlyOut: boolean;
      shiftEnd: string | null;
      distanceM: number;
      photo: boolean;
    }>("/attendance/check-out", { method: "POST", json: loc }),

  attendanceLog: (month?: string) =>
    request<ApiLogEntry[]>(`/attendance/log${month ? `?month=${month}` : ""}`),

  requests: () => request<ApiRequest[]>("/requests"),

  submitCuti: (data: {
    type: LeaveType;
    startDate: string;
    days?: number;
    place?: "inCity" | "outside";
    doctorNote?: boolean;
  }) =>
    request<{ id: number; type: string; days: number; startDate: string; endDate: string; status: string }>(
      "/requests/cuti",
      { method: "POST", json: data },
    ),

  submitDinas: (data: { dest: string; departDate: string; overnight?: boolean; nights?: number }) =>
    request<{
      id: number;
      dest: string;
      jabodetabek: boolean;
      departDate: string;
      returnDate: string;
      nights: number;
      allowance: { transport: number; meals: number; lodging: number; total: number };
      status: string;
    }>("/requests/dinas", { method: "POST", json: data }),

  submitLembur: (data: { date: string; hours: number }) =>
    request<{ id: number; date: string; hours: number; tariff: string; weeklyRemainingHours: number; status: string }>(
      "/requests/lembur",
      { method: "POST", json: data },
    ),

  // ── Admin ──────────────────────────────────────────────────────
  adminUsers: (status?: "pending" | "approved" | "rejected") =>
    request<ApiUser[]>(`/admin/users${status ? `?status=${status}` : ""}`),

  adminDecideUser: (id: number, decision: "approved" | "rejected") =>
    request<{ id: number; status: string }>(`/admin/users/${id}/decision`, {
      method: "POST",
      json: { decision },
    }),

  adminRequests: (status?: "Menunggu" | "Disetujui" | "Ditolak") =>
    request<AdminRequest[]>(`/admin/requests${status ? `?status=${status}` : ""}`),

  adminDecideRequest: (id: number, decision: "Disetujui" | "Ditolak") =>
    request<{ id: number; status: string }>(`/admin/requests/${id}/decision`, {
      method: "POST",
      json: { decision },
    }),

  adminSetPosition: (id: number, position: Position) =>
    request<{ id: number; position: Position }>(`/admin/users/${id}/position`, {
      method: "POST",
      json: { position },
    }),

  adminAbsences: (month?: string) =>
    request<{ month: string; from: string; to: string; absences: ApiAbsence[] }>(
      `/admin/absences${month ? `?month=${month}` : ""}`,
    ),

  adminAttendance: (date?: string) =>
    request<{ date: string; sessions: AdminSession[] }>(
      `/admin/attendance${date ? `?date=${date}` : ""}`,
    ),
};

export interface AdminSession {
  id: number;
  userName: string;
  shift: number;
  checkIn: string;
  checkOut: string | null;
  late: boolean;
  earlyOut: boolean;
  special: boolean;
  distanceM: number | null;
  photoIn: boolean;
  photoOut: boolean;
}

/** Selfie endpoint (requires the Authorization header — fetch as a blob). */
export const photoUrl = (attendanceId: number, kind: "in" | "out") =>
  `/api/photos/${attendanceId}/${kind}`;
