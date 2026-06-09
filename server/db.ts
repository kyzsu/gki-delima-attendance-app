import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./auth.ts";
import { DEFAULT_LEAVE_BALANCE, dateStr } from "./rules.ts";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(
  process.env.GKI_DB_PATH ?? path.join(dir, "gki.db"),
);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    nip           TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee','admin')),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    leave_balance INTEGER NOT NULL DEFAULT ${DEFAULT_LEAVE_BALANCE},
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    date       TEXT NOT NULL,             -- local YYYY-MM-DD
    check_in   TEXT NOT NULL,             -- ISO timestamp
    check_out  TEXT,
    late       INTEGER NOT NULL DEFAULT 0,
    distance_m INTEGER,
    UNIQUE (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    kind        TEXT NOT NULL CHECK (kind IN ('cuti','dinas','lembur')),
    title       TEXT NOT NULL,
    detail      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu','Disetujui','Ditolak')),
    leave_type  TEXT,                     -- cuti: tahunan|sakit|darurat|duka
    place       TEXT,                     -- cuti duka: inCity|outside
    doctor_note INTEGER,                  -- cuti sakit: surat dokter attached
    start_date  TEXT,
    end_date    TEXT,
    days        INTEGER,
    dest        TEXT,                     -- dinas
    overnight   INTEGER,                  -- dinas
    nights      INTEGER,                  -- dinas
    amount      INTEGER,                  -- dinas: total allowance (IDR)
    hours       REAL,                     -- lembur
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
`);

// ── Seed (first run only) ────────────────────────────────────────
const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
if (userCount.n === 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (name, nip, email, phone, password_hash, role, status, leave_balance)
    VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)
  `);
  insertUser.run(
    "Admin Personalia", "GKID-0001", "admin@gkidelima.org", "+62 811 0000 001",
    hashPassword("admin123"), "admin", DEFAULT_LEAVE_BALANCE,
  );
  const ruth = insertUser.run(
    "Ruth Simanjuntak", "GKID-0214", "ruth.simanjuntak@gkidelima.org", "+62 812 3456 789",
    hashPassword("gkidelima"), "employee", 7,
  );
  const uid = Number(ruth.lastInsertRowid);

  // Attendance history matching the frontend seed (yesterday + earlier days).
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d;
  };
  const at = (d: Date, h: number, m: number) => {
    const t = new Date(d);
    t.setHours(h, m, 0, 0);
    return t.toISOString();
  };
  const insertAtt = db.prepare(`
    INSERT INTO attendance (user_id, date, check_in, check_out, late)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAtt.run(uid, dateStr(day(1)), at(day(1), 7, 52), at(day(1), 16, 5), 0);
  insertAtt.run(uid, dateStr(day(2)), at(day(2), 7, 48), at(day(2), 16, 12), 0);
  insertAtt.run(uid, dateStr(day(5)), at(day(5), 8, 6), at(day(5), 16, 1), 1);

  const insertReq = db.prepare(`
    INSERT INTO requests (user_id, kind, title, detail, status, leave_type, start_date, days, dest, overnight, nights, amount, hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReq.run(uid, "dinas", "Dinas — Bandung", "2 mlm · Rp 1.025.000", "Disetujui",
    null, dateStr(day(-1)), 3, "Bandung", 1, 2, 1_025_000, null);
  insertReq.run(uid, "lembur", "Lembur — Kamis", "2,0 jam", "Menunggu",
    null, dateStr(day(-1)), null, null, null, null, null, 2);
  insertReq.run(uid, "cuti", "Cuti Tahunan", "1 hari · " + dateStr(day(0)), "Disetujui",
    "tahunan", dateStr(day(0)), 1, null, null, null, null, null);
}

export interface UserRow {
  id: number;
  name: string;
  nip: string;
  email: string;
  phone: string;
  password_hash: string;
  role: "employee" | "admin";
  status: "pending" | "approved" | "rejected";
  leave_balance: number;
  created_at: string;
}

export interface AttendanceRow {
  id: number;
  user_id: number;
  date: string;
  check_in: string;
  check_out: string | null;
  late: number;
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
  doctor_note: number | null;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  dest: string | null;
  overnight: number | null;
  nights: number | null;
  amount: number | null;
  hours: number | null;
  created_at: string;
}
