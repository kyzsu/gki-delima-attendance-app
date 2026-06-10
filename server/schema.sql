-- GKI Delima attendance schema (Postgres / Supabase).
-- Applied idempotently by `npm run db:setup` (which also runs the
-- ALTER-based migrations for databases created before Pasal 5 support).
-- Date-only fields are TEXT (YYYY-MM-DD, church-local) on purpose: they are
-- compared and prefix-matched as strings and never need timezone semantics.

CREATE TABLE IF NOT EXISTS users (
  id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  nip           TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  position      TEXT NOT NULL DEFAULT 'tata_usaha' CHECK (position IN ('tata_usaha', 'sopir', 'koster')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  leave_balance INT  NOT NULL DEFAULT 12,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id),
  date           TEXT NOT NULL,           -- YYYY-MM-DD, church-local
  shift          INT NOT NULL DEFAULT 0,  -- session index within the day (Sunday Tata Usaha has 2)
  check_in       TIMESTAMPTZ NOT NULL,
  check_out      TIMESTAMPTZ,
  late           BOOLEAN NOT NULL DEFAULT false,
  early_out      BOOLEAN NOT NULL DEFAULT false,
  special        BOOLEAN NOT NULL DEFAULT false, -- off-schedule "tugas khusus pelayanan gerejawi"
  worked_minutes INT,                      -- net of the 1-hour break (Pasal 5 ayat 4)
  distance_m     INT,
  UNIQUE (user_id, date, shift)
);

CREATE TABLE IF NOT EXISTS requests (
  id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL CHECK (kind IN ('cuti', 'dinas', 'lembur')),
  title       TEXT NOT NULL,
  detail      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')),
  leave_type  TEXT,                      -- cuti: see LeaveType in server/rules.ts
  place       TEXT,                      -- cuti duka_ortu: inCity|outside
  doctor_note BOOLEAN,                   -- cuti sakit: surat dokter attached
  start_date  TEXT,                      -- YYYY-MM-DD
  end_date    TEXT,                      -- YYYY-MM-DD
  days        INT,
  dest        TEXT,                      -- dinas
  overnight   BOOLEAN,                   -- dinas
  nights      INT,                       -- dinas
  amount      INT,                       -- dinas: total allowance (IDR)
  hours       DOUBLE PRECISION,          -- lembur
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_user_date ON attendance (user_id, date DESC);
CREATE INDEX IF NOT EXISTS requests_user_id ON requests (user_id, id DESC);
CREATE INDEX IF NOT EXISTS requests_lembur_caps ON requests (user_id, kind, start_date);
