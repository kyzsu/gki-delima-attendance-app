import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldLabel, PseudoField, DateField } from "@/components/ui/field";
import { ChipRow } from "@/components/ui/chip-row";
import { Seg } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { Note } from "@/components/ui/note";
import { SummaryCard, Row } from "@/components/ui/summary-card";
import { ScreenHead } from "@/components/screen-head";
import { FormScreen } from "@/components/form-screen";
import { SentScaffold } from "@/components/sent-scaffold";
import { Ic, RIc, bigClock } from "@/components/icons";
import { useApp, dateStr, fmtDateLong } from "@/app/store";
import { api, type LeaveType } from "@/lib/api";

type Place = "inCity" | "outside";

const fmtD = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** End date after counting `days` working days from start, skipping Senin and
 *  national holidays (they don't consume the leave). */
function workingEnd(start: Date, days: number, holidays: Set<string>): Date {
  let count = 0;
  let end = start;
  for (let i = 0; i < 366 && count < days; i++) {
    const d = addDays(start, i);
    if (d.getDay() === 1) continue; // Senin libur
    if (holidays.has(dateStr(d))) continue; // libur nasional
    count++;
    end = d;
  }
  return end;
}

/** Downscale a camera photo to a JPEG data URL small enough to upload. */
function fileToJpeg(file: File, maxW = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

// Pasal 5 ayat (5)–(7) — one chip per permitted-absence reason.
const LEAVE_OPTS: { v: LeaveType; label: string; icon: React.ReactNode }[] = [
  { v: "tahunan", label: "Tahunan", icon: RIc.calX },
  { v: "sakit", label: "Sakit", icon: RIc.heart },
  { v: "izin", label: "Izin", icon: RIc.siren },
  { v: "duka_inti", label: "Duka Inti", icon: RIc.dot },
  { v: "duka_ortu", label: "Duka Ortu", icon: RIc.building },
  { v: "menikah", label: "Menikah", icon: RIc.sun },
  { v: "menikahkan_anak", label: "Nikah Anak", icon: Ic.user },
  { v: "baptis_khitan", label: "Baptis / Khitan", icon: RIc.file },
  { v: "istri_melahirkan", label: "Istri Lahiran", icon: RIc.bed },
  { v: "melahirkan", label: "Melahirkan", icon: RIc.hourglass },
];

export const LABEL: Record<LeaveType, string> = {
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

/** Fixed entitlements in working days (mirrors server/rules.ts). */
const FIXED_DAYS: Partial<Record<LeaveType, number>> = {
  izin: 1,
  duka_inti: 2,
  menikah: 2,
  menikahkan_anak: 2,
  baptis_khitan: 1,
  istri_melahirkan: 1,
};

const MELAHIRKAN_DAYS = 90;

// ── LEAVE · 1 — form with dynamic rules per leave type ────────────
export function LeaveFormScreen() {
  const navigate = useNavigate();
  const { leaveBalance, submitLeave } = useApp();
  const [type, setType] = React.useState<LeaveType>("tahunan");
  const [place, setPlace] = React.useState<Place>("inCity");
  const [startDate, setStartDate] = React.useState(() => dateStr());
  const [tahunanDays, setTahunanDays] = React.useState(1);
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // National holidays for the leave's year — excluded from the day count.
  React.useEffect(() => {
    let alive = true;
    api
      .holidays(Number(startDate.slice(0, 4)))
      .then((r) => alive && setHolidays(new Set(r.holidays.map((h) => h.date))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [startDate]);

  // Annual leave is variable-length, bounded by the remaining balance;
  // every other type has a fixed entitlement from Pasal 5.
  const maxTahunan = Math.max(1, leaveBalance);
  const days =
    type === "tahunan"
      ? Math.min(tahunanDays, maxTahunan)
      : FIXED_DAYS[type] ??
        (type === "duka_ortu" ? (place === "inCity" ? 2 : 4) : type === "melahirkan" ? MELAHIRKAN_DAYS : 1);
  const cutsBalance = type === "tahunan" || type === "izin";
  const insufficient = cutsBalance && days > leaveBalance;
  // End date counts working days only — Senin and national holidays are
  // skipped (they don't consume the leave), mirroring the server.
  const start = new Date(`${startDate}T00:00:00`);
  const end = workingEnd(start, days, holidays);

  async function submit() {
    if (type === "sakit") {
      navigate("/requests/leave/sick");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitLeave({
        type,
        startDate,
        days,
        ...(type === "duka_ortu" ? { place } : {}),
      });
      navigate("/requests/leave/sent", { state: { type, days } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <FormScreen
      head={<ScreenHead title="Pengajuan Cuti & Izin" sub="Pilih alasan — aturan Pasal 5 menyesuaikan otomatis." close to="/requests" />}
      footer={
        <>
          {error && (
            <div className="mb-3">
              <Note tone="danger" icon={RIc.siren}>{error}</Note>
            </div>
          )}
          <Button variant="primary" disabled={busy || insufficient} onClick={submit}>
            {busy
              ? "Mengirim…"
              : insufficient
                ? "Saldo cuti tidak cukup"
                : type === "sakit"
                  ? "Lanjutkan"
                  : "Kirim Pengajuan"}
          </Button>
          {cutsBalance && type === "izin" && (
            <div className="text-center text-[11.5px] text-muted mt-2">
              Di luar alasan ayat (5), izin diberikan atas pertimbangan Koordinator Personalia.
            </div>
          )}
        </>
      }
    >
      <FieldLabel upper>Jenis</FieldLabel>
      <div className="mb-4">
        <ChipRow options={LEAVE_OPTS} value={type} onChange={setType} />
      </div>

      <div className="flex gap-[10px] mb-4">
        <div className="flex-1">
          <FieldLabel upper>Mulai</FieldLabel>
          <DateField icon={Ic.calendar} value={startDate} onChange={setStartDate} min={dateStr()} />
        </div>
        <div className="flex-1">
          <FieldLabel upper hint="otomatis">Selesai</FieldLabel>
          <PseudoField icon={Ic.calendar}>{fmtD(end)}</PseudoField>
        </div>
      </div>

      {type === "tahunan" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center bg-tint rounded-[13px] px-4 py-[11px]">
            <span className="text-[13px] font-bold text-ink">Jumlah hari</span>
            <Stepper
              value={days}
              suffix=" hari"
              onDec={() => setTahunanDays((d) => Math.max(1, d - 1))}
              onInc={() => setTahunanDays((d) => Math.min(maxTahunan, d + 1))}
            />
          </div>
          <div className="flex justify-between items-center bg-tint rounded-[13px] px-4 py-[14px]">
            <span className="text-[13px] font-bold text-ink">Saldo cuti tahunan</span>
            <span className="text-[18px] font-extrabold text-primary">{leaveBalance} hari</span>
          </div>
          {insufficient ? (
            <Note tone="danger" icon={Ic.alert}>
              Saldo cuti tahunan tidak cukup untuk <b>{days} hari</b> (sisa <b>{leaveBalance} hari</b>).
            </Note>
          ) : (
            <Note tone="info" icon={RIc.file}>
              Mengajukan <b>{days} hari</b> — saldo setelah disetujui menjadi <b>{leaveBalance - days} hari</b>.
            </Note>
          )}
        </div>
      )}
      {type === "izin" && (
        <div className="flex flex-col gap-3">
          <Note tone="warn" icon={RIc.siren}>
            Ayat (7): maks <b>1 hari kerja</b>, <b>1×/bulan</b> pelayanan, <b>3×/tahun</b> pelayanan.
          </Note>
          <Note tone="danger" icon={Ic.alert}>
            Izin <b>dipotong dari saldo cuti tahunan</b> (sisa {leaveBalance} → {Math.max(0, leaveBalance - 1)} hari).
          </Note>
        </div>
      )}
      {type === "duka_inti" && (
        <Note tone="info" icon={RIc.dot}>
          Anak atau suami/istri meninggal dunia — <b>2 hari kerja</b>, tanpa potongan saldo.
        </Note>
      )}
      {type === "duka_ortu" && (
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel upper hint="memengaruhi maks hari">Lokasi duka</FieldLabel>
            <Seg
              value={place}
              onChange={setPlace}
              options={[
                { v: "inCity", label: "Dalam Kota", icon: RIc.building },
                { v: "outside", label: "Luar Jawa", icon: RIc.plane },
              ]}
            />
          </div>
          <div className="flex justify-between items-center bg-tint rounded-[13px] px-4 py-[14px]">
            <span className="text-[13px] font-bold text-ink">Maksimum hari</span>
            <span className="text-[18px] font-extrabold text-primary">{days} hari</span>
          </div>
        </div>
      )}
      {(type === "menikah" || type === "menikahkan_anak" || type === "baptis_khitan" || type === "istri_melahirkan") && (
        <Note tone="ok" icon={Ic.check}>
          {LABEL[type]} — <b>{days} hari kerja</b> sesuai ketentuan, tanpa potongan saldo.
        </Note>
      )}
      {type === "melahirkan" && (
        <Note tone="info" icon={RIc.heart}>
          Sesuai ketentuan cuti hamil/melahirkan — <b>{MELAHIRKAN_DAYS} hari</b>, tanpa potongan saldo.
        </Note>
      )}
      {type === "sakit" && (
        <Note tone="info" icon={RIc.heart}>
          Cuti sakit tidak memotong saldo. Foto surat dokter bisa dilampirkan di langkah berikut (opsional).
        </Note>
      )}

    </FormScreen>
  );
}

// ── LEAVE · 2 — sakit; optional doctor's-letter photo, never cuts balance ─
export function SickLeaveScreen() {
  const navigate = useNavigate();
  const { submitLeave } = useApp();
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const today = new Date();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setPhoto(await fileToJpeg(f));
    } catch {
      setError("Gagal membaca foto.");
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await submitLeave({ type: "sakit", startDate: dateStr(today), days: 1, attachment: photo ?? undefined });
      navigate("/requests/leave/sent", { state: { type: "sakit", days: 1 } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <FormScreen
      head={<ScreenHead title="Cuti Sakit" sub="Tidak memotong saldo cuti tahunan." />}
      footer={
        <>
          {error && (
            <div className="mb-3">
              <Note tone="danger" icon={Ic.alert}>{error}</Note>
            </div>
          )}
          <Button variant="primary" disabled={busy} onClick={submit}>
            {busy ? "Mengirim…" : "Kirim Pengajuan"}
          </Button>
        </>
      }
    >
      <Note tone="ok" icon={Ic.check}>
        Cuti sakit <b>tidak memotong</b> saldo cuti tahunan. Melampirkan foto surat dokter bersifat opsional.
      </Note>

      <div className="mt-4">
        <FieldLabel upper>Surat dokter (opsional)</FieldLabel>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
        {photo ? (
          <div className="relative rounded-[15px] overflow-hidden border border-line">
            <img src={photo} alt="Surat dokter" className="w-full max-h-[260px] object-cover" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 bg-white/90 text-ink text-[12px] font-bold px-3 py-[6px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            >
              Ganti foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 bg-card border border-dashed border-line2 rounded-[15px] px-4 py-6 cursor-pointer"
          >
            <span className="w-11 h-11 rounded-full bg-tint text-primary flex items-center justify-center">{Ic.camera}</span>
            <span className="text-[13px] font-bold text-ink">Foto surat dokter</span>
            <span className="text-[11.5px] text-muted">Buka kamera & ambil foto surat</span>
          </button>
        )}
      </div>

      <div className="mt-5">
        <FieldLabel upper>Ringkasan</FieldLabel>
        <SummaryCard>
          <Row k="Jenis" v="Cuti Sakit" />
          <Row k="Tanggal" v={fmtDateLong(today)} />
          <Row k="Surat dokter" v={photo ? "Terlampir" : "Tidak ada"} />
          <Row k="Potong saldo tahunan" v="Tidak" last />
        </SummaryCard>
      </div>

    </FormScreen>
  );
}

// ── LEAVE · 3 — sent ──────────────────────────────────────────────
export function LeaveSentScreen() {
  const location = useLocation();
  const state = (location.state ?? {}) as { type?: string; days?: number };
  const jenis = LABEL[state.type as LeaveType] ?? "Cuti Tahunan";
  const days = state.days ?? 1;
  return (
    <SentScaffold
      icon={bigClock}
      title="Pengajuan terkirim"
      sub="Menunggu persetujuan Koordinator Personalia. Anda akan diberi tahu lewat notifikasi."
    >
      <SummaryCard>
        <Row k="Jenis" v={jenis} />
        <Row k="Durasi" v={`${days} hari`} />
        <Row k="Tanggal" v={fmtDateLong(new Date())} />
        <Row k="Status" v="Menunggu persetujuan" last />
      </SummaryCard>
    </SentScaffold>
  );
}
