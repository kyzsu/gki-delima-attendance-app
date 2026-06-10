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
export interface ApiUser {
  id: number;
  name: string;
  nip: string;
  email: string;
  phone: string;
  role: "employee" | "admin";
  status: "pending" | "approved" | "rejected";
  leaveBalance: number;
}

export interface ApiToday {
  checkIn: string;
  checkOut: string | null;
  late: boolean;
  distanceM: number | null;
}

export interface ApiLogEntry {
  date: string; // YYYY-MM-DD
  checkIn: string;
  checkOut: string | null;
  late: boolean;
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

  me: () => request<{ user: ApiUser; today: ApiToday | null }>("/auth/me"),

  checkIn: (loc: Coords) =>
    request<{ checkIn: string; late: boolean; distanceM: number }>("/attendance/check-in", {
      method: "POST",
      json: loc,
    }),

  checkOut: (loc: Coords) =>
    request<{ checkIn: string; checkOut: string; workedMs: number; distanceM: number }>(
      "/attendance/check-out",
      { method: "POST", json: loc },
    ),

  attendanceLog: () => request<ApiLogEntry[]>("/attendance/log"),

  requests: () => request<ApiRequest[]>("/requests"),

  submitCuti: (data: {
    type: "tahunan" | "sakit" | "darurat" | "duka";
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
};
