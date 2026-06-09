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
import { useApp } from "@/app/store";

type LeaveType = "tahunan" | "sakit" | "darurat" | "duka";
type Place = "inCity" | "outside";

const LEAVE_OPTS: { v: LeaveType; label: string; icon: React.ReactNode }[] = [
  { v: "tahunan", label: "Tahunan", icon: RIc.calX },
  { v: "sakit", label: "Sakit", icon: RIc.heart },
  { v: "darurat", label: "Darurat", icon: RIc.siren },
  { v: "duka", label: "Duka", icon: RIc.dot },
];

const LABEL: Record<LeaveType, string> = {
  tahunan: "Cuti Tahunan",
  sakit: "Cuti Sakit",
  darurat: "Cuti Darurat",
  duka: "Cuti Duka",
};

// ── CUTI · 1 — form with dynamic rules per leave type ────────────
export function CutiFormScreen() {
  const navigate = useNavigate();
  const { leaveBalance, addRequest } = useApp();
  const [type, setType] = React.useState<LeaveType>("tahunan");
  const [place, setPlace] = React.useState<Place>("inCity");
  const bereMax = place === "inCity" ? 2 : 4;

  function submit() {
    if (type === "sakit") {
      navigate("/requests/cuti/sakit");
      return;
    }
    addRequest({
      kind: "cuti",
      title: LABEL[type],
      detail: type === "duka" ? `${bereMax} hari · mulai 10 Jun` : "1 hari · 10 Jun",
      status: "Menunggu",
    });
    navigate("/requests/cuti/sent", { state: { type, days: type === "duka" ? bereMax : 1 } });
  }

  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-[58px] pb-10">
      <ScreenHead title="Pengajuan Cuti" sub="Pilih jenis — aturan menyesuaikan otomatis." close to="/requests" />
      <FieldLabel upper>Jenis Cuti</FieldLabel>
      <div className="mb-4">
        <ChipRow options={LEAVE_OPTS} value={type} onChange={setType} />
      </div>

      <div className="flex gap-[10px] mb-4">
        <div className="flex-1">
          <FieldLabel upper>Mulai</FieldLabel>
          <PseudoField icon={Ic.calendar}>10 Jun</PseudoField>
        </div>
        <div className="flex-1">
          <FieldLabel upper>Selesai</FieldLabel>
          <PseudoField icon={Ic.calendar}>{type === "duka" ? `${10 + bereMax - 1} Jun` : "11 Jun"}</PseudoField>
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
      {type === "darurat" && (
        <div className="flex flex-col gap-3">
          <Note tone="warn" icon={RIc.siren}>
            Matriks darurat: maks <b>1 hari/pengajuan</b>, <b>1×/bulan</b>, <b>3×/tahun</b>.
          </Note>
          <div className="flex justify-between items-center bg-tint rounded-[13px] px-4 py-[14px]">
            <span className="text-[13px] font-bold text-ink">Kuota tahun ini</span>
            <span className="text-[16px] font-extrabold text-primary">2 / 3 dipakai</span>
          </div>
        </div>
      )}
      {type === "duka" && (
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
            <span className="text-[18px] font-extrabold text-primary">{bereMax} hari</span>
          </div>
        </div>
      )}
      {type === "sakit" && (
        <Note tone="info" icon={RIc.heart}>
          Lampirkan surat dokter pada langkah berikut agar saldo tahunan tidak terpotong.
        </Note>
      )}

      <div className="flex-1 min-h-4" />
      <Button variant="primary" onClick={submit}>{type === "sakit" ? "Lanjutkan" : "Kirim Pengajuan"}</Button>
    </div>
  );
}

// ── CUTI · 2 — sakit, doctor's note toggle ───────────────────────
export function CutiSakitScreen() {
  const navigate = useNavigate();
  const { leaveBalance, addRequest } = useApp();
  const [hasNote, setHasNote] = React.useState(false);

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
          <Row k="Tanggal" v="10 Jun 2026" />
          <Row k="Surat dokter" v={hasNote ? "Terlampir" : "Tidak ada"} />
          <Row k="Potong saldo tahunan" v={hasNote ? "Tidak" : "1 hari"} last />
        </SummaryCard>
      </div>

      <div className="flex-1 min-h-4" />
      <Button
        variant="primary"
        onClick={() => {
          addRequest({
            kind: "cuti",
            title: "Cuti Sakit",
            detail: hasNote ? "1 hari · surat dokter" : "1 hari · tanpa surat",
            status: "Menunggu",
          });
          navigate("/requests/cuti/sent", { state: { type: "sakit", days: 1 } });
        }}
      >
        Kirim Pengajuan
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
      title="Pengajuan cuti terkirim"
      sub="Menunggu persetujuan Koordinator Personalia. Anda akan diberi tahu lewat notifikasi."
    >
      <SummaryCard>
        <Row k="Jenis" v={jenis} />
        <Row k="Durasi" v={`${days} hari`} />
        <Row k="Tanggal" v="10 Jun 2026" />
        <Row k="Status" v="Menunggu persetujuan" last />
      </SummaryCard>
    </SentScaffold>
  );
}
