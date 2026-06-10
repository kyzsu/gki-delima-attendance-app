import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldLabel, PseudoField } from "@/components/ui/field";
import { ChipRow } from "@/components/ui/chip-row";
import { Seg } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Note } from "@/components/ui/note";
import { SummaryCard, Row } from "@/components/ui/summary-card";
import { ScreenHead } from "@/components/screen-head";
import { SentScaffold } from "@/components/sent-scaffold";
import { Ic, RIc, bigClock } from "@/components/icons";
import { useApp, dateStr, fmtDateLong } from "@/app/store";
import type { LeaveType } from "@/lib/api";

type Place = "inCity" | "outside";

const fmtD = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

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

// ── CUTI · 1 — form with dynamic rules per leave type ────────────
export function CutiFormScreen() {
  const navigate = useNavigate();
  const { leaveBalance, submitCuti } = useApp();
  const [type, setType] = React.useState<LeaveType>("tahunan");
  const [place, setPlace] = React.useState<Place>("inCity");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const start = new Date();

  const days =
    FIXED_DAYS[type] ??
    (type === "duka_ortu" ? (place === "inCity" ? 2 : 4) : type === "melahirkan" ? MELAHIRKAN_DAYS : 1);
  const cutsBalance = type === "tahunan" || type === "izin";

  async function submit() {
    if (type === "sakit") {
      navigate("/requests/cuti/sakit");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitCuti({
        type,
        startDate: dateStr(start),
        days,
        ...(type === "duka_ortu" ? { place } : {}),
      });
      navigate("/requests/cuti/sent", { state: { type, days } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-[58px] pb-10">
      <ScreenHead title="Pengajuan Cuti & Izin" sub="Pilih alasan — aturan Pasal 5 menyesuaikan otomatis." close to="/requests" />
      <FieldLabel upper>Jenis</FieldLabel>
      <div className="mb-4">
        <ChipRow options={LEAVE_OPTS} value={type} onChange={setType} />
      </div>

      <div className="flex gap-[10px] mb-4">
        <div className="flex-1">
          <FieldLabel upper>Mulai</FieldLabel>
          <PseudoField icon={Ic.calendar}>{fmtD(start)}</PseudoField>
        </div>
        <div className="flex-1">
          <FieldLabel upper>Selesai</FieldLabel>
          <PseudoField icon={Ic.calendar}>{fmtD(addDays(start, days - 1))}</PseudoField>
        </div>
      </div>

      {type === "tahunan" && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center bg-tint rounded-[13px] px-4 py-[14px]">
            <span className="text-[13px] font-bold text-ink">Saldo cuti tahunan</span>
            <span className="text-[18px] font-extrabold text-primary">{leaveBalance} hari</span>
          </div>
          <Note tone="info" icon={RIc.file}>
            Mengajukan <b>1 hari</b> — saldo setelah disetujui menjadi <b>{leaveBalance - 1} hari</b>.
          </Note>
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
          Lampirkan surat dokter pada langkah berikut agar saldo tahunan tidak terpotong.
        </Note>
      )}

      <div className="flex-1 min-h-4" />
      {error && (
        <div className="mb-3">
          <Note tone="danger" icon={RIc.siren}>{error}</Note>
        </div>
      )}
      <Button variant="primary" disabled={busy} onClick={submit}>
        {busy ? "Mengirim…" : type === "sakit" ? "Lanjutkan" : "Kirim Pengajuan"}
      </Button>
      {cutsBalance && type === "izin" && (
        <div className="text-center text-[11.5px] text-muted mt-2">
          Di luar alasan ayat (5), izin diberikan atas pertimbangan Koordinator Personalia.
        </div>
      )}
    </div>
  );
}

// ── CUTI · 2 — sakit, doctor's note toggle ───────────────────────
export function CutiSakitScreen() {
  const navigate = useNavigate();
  const { leaveBalance, submitCuti } = useApp();
  const [hasNote, setHasNote] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const today = new Date();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await submitCuti({ type: "sakit", startDate: dateStr(today), days: 1, doctorNote: hasNote });
      navigate("/requests/cuti/sent", { state: { type: "sakit", days: 1 } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-[58px] pb-10">
      <ScreenHead title="Cuti Sakit" sub="Surat dokter menentukan potongan saldo." />
      <div className="flex justify-between items-center bg-card border border-line rounded-[15px] px-4 py-[15px] mb-[14px]">
        <div className="flex-1 pr-3">
          <div className="text-[13.5px] font-extrabold text-ink">Melampirkan surat dokter?</div>
          <div className="text-[12px] text-muted mt-[2px] leading-[1.4]">Tanpa surat memotong saldo cuti tahunan.</div>
        </div>
        <Switch checked={hasNote} onCheckedChange={setHasNote} label="Surat dokter" />
      </div>

      {hasNote ? (
        <Note tone="ok" icon={Ic.check}>
          Surat dokter terlampir. Dicatat sebagai <b>cuti sakit</b> tanpa potongan saldo tahunan.
        </Note>
      ) : (
        <Note tone="danger" icon={Ic.alert}>
          Tanpa surat dokter — sistem memotong <b>1 hari saldo cuti tahunan</b> (sisa {leaveBalance} → {leaveBalance - 1} hari).
        </Note>
      )}

      <div className="mt-5">
        <FieldLabel upper>Ringkasan</FieldLabel>
        <SummaryCard>
          <Row k="Jenis" v="Cuti Sakit" />
          <Row k="Tanggal" v={fmtDateLong(today)} />
          <Row k="Surat dokter" v={hasNote ? "Terlampir" : "Tidak ada"} />
          <Row k="Potong saldo tahunan" v={hasNote ? "Tidak" : "1 hari"} last />
        </SummaryCard>
      </div>

      <div className="flex-1 min-h-4" />
      {error && (
        <div className="mb-3">
          <Note tone="danger" icon={Ic.alert}>{error}</Note>
        </div>
      )}
      <Button variant="primary" disabled={busy} onClick={submit}>
        {busy ? "Mengirim…" : "Kirim Pengajuan"}
      </Button>
    </div>
  );
}

// ── CUTI · 3 — sent ──────────────────────────────────────────────
export function CutiSentScreen() {
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
