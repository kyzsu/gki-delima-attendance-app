import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Point it at your Supabase Postgres — use the pooled " +
      "connection string (Supavisor, port 6543) for serverless deployments.",
  );
}

// prepare:false is required for Supavisor's transaction-pooling mode.
// One connection per serverless instance; a small pool for local dev.
export const sql = postgres(url, {
  prepare: false,
  max: process.env.VERCEL ? 1 : 5,
});

export interface UserRow {
  id: number;
  name: string;
  nip: string;
  email: string;
  phone: string;
  password_hash: string;
  role: "employee" | "admin";
  position: "tata_usaha" | "sopir" | "koster";
  status: "pending" | "approved" | "rejected";
  leave_balance: number;
  must_change_password: boolean;
  reset_requested_at: Date | null;
  created_at: Date;
}

export interface AttendanceRow {
  id: number;
  user_id: number;
  date: string;
  shift: number;
  check_in: Date;
  check_out: Date | null;
  late: boolean;
  early_out: boolean;
  special: boolean;
  worked_minutes: number | null;
  distance_m: number | null;
}

export interface RequestRow {
  id: number;
  user_id: number;
  kind: "cuti" | "dinas" | "lembur";
  title: string;
  detail: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  leave_type: string | null;
  place: string | null;
  doctor_note: boolean | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  dest: string | null;
  overnight: boolean | null;
  nights: number | null;
  amount: number | null;
  hours: number | null;
  note: string | null;
  reject_reason: string | null;
  created_at: Date;
}
