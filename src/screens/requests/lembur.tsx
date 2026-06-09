import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldLabel, PseudoField } from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";
import { Note } from "@/components/ui/note";
import { SummaryCard, Row } from "@/components/ui/summary-card";
import { ScreenHead } from "@/components/screen-head";
import { SentScaffold } from "@/components/sent-scaffold";
import { Ic, bigClock } from "@/components/icons";
import { useApp } from "@/app/store";

const DAILY_CAP = 3;
const WEEKLY_CAP = 14;
const WEEKLY_USED = 4.5;

const fmtH = (h: number) => h.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function LemburGauge({ hours, cap }: { hours: number; cap: number }) {
  const pct = Math.min(hours / cap, 1);
  const over = hours > cap;
  return (
    <div className="mt-1">
      <div className="flex justify-between mb-[7px]">
        <span className="text-[12px] font-bold text-muted">Cap harian</span>
        <span className="text-[12.5px] font-extrabold" style={{ color: over ? "var(--danger)" : "var(--primary)" }}>
          {fmtH(hours)}j / {cap}j
        </span>
      </div>
      <div className="h-[9px] rounded-full bg-line overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: pct * 100 + "%", background: over ? "var(--danger-dot)" : "var(--grad)" }}
        />
      </div>
    </div>
  );
}

// ── LEMBUR · form with real-time cap validation ──────────────────
// Within cap = positive path; over cap = blocked with non-payable breakdown.
export function LemburFormScreen() {
  const navigate = useNavigate();
  const { addRequest } = useApp();
  const [hours, setHours] = React.useState(2);
  const over = hours > DAILY_CAP;
  const payable = Math.min(hours, DAILY_CAP);
  const nonPayable = Math.max(0, hours - DAILY_CAP);

  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-[58px] pb-10">
      <ScreenHead title="Pengajuan Lembur" sub={`Maks ${DAILY_CAP} jam/hari · ${WEEKLY_CAP} jam/minggu.`} close to="/requests" />
      <div className="flex gap-[10px] mb-4">
        <div className="flex-1">
          <FieldLabel upper>Tanggal</FieldLabel>
          <PseudoField icon={Ic.calendar}>Kamis, 11 Jun</PseudoField>
        </div>
      </div>

      <FieldLabel upper>Durasi lembur</FieldLabel>
      <div
        className="flex justify-between items-center rounded-[15px] px-[18px] py-[14px]"
        style={
          over
            ? { background: "#FFF5F7", border: "1.5px solid #F3C6D1" }
            : { background: "var(--card)", border: "1px solid var(--line)" }
        }
      >
        <span className="text-[13px] font-bold" style={{ color: over ? "var(--danger)" : "var(--text)" }}>
          Jam diajukan
        </span>
        <Stepper
          value={hours}
          suffix="j"
          onDec={() => setHours((h) => Math.max(0.5, +(h - 0.5).toFixed(1)))}
          onInc={() => setHours((h) => Math.min(8, +(h + 0.5).toFixed(1)))}
        />
      </div>
      <div className="mt-[14px]">
        <LemburGauge hours={hours} cap={DAILY_CAP} />
      </div>

      <div className="mt-4 flex flex-col gap-[10px]">
        {over ? (
          <>
            <Note tone="danger" icon={Ic.alert}>
              Melebihi cap harian <b>{DAILY_CAP} jam</b>. <b>{fmtH(nonPayable)} jam</b> kelebihan otomatis ditandai <b>non-payable</b>.
            </Note>
            <SummaryCard>
              <Row k="Jam payable" v={`${fmtH(payable)} jam`} />
              <Row k="Jam non-payable" v={`${fmtH(nonPayable)} jam`} />
              <Row k="Sisa kuota mingguan" v={`${fmtH(WEEKLY_CAP - WEEKLY_USED)} / ${WEEKLY_CAP} jam`} last />
            </SummaryCard>
          </>
        ) : (
          <Note tone="ok" icon={Ic.shield}>
            Dalam batas aman. Lembur dibayar dengan tarif <b>1/173</b> gaji pokok per jam.
          </Note>
        )}
      </div>

      <div className="flex-1 min-h-4" />
      <Button
        variant="primary"
        disabled={over}
        onClick={() => {
          addRequest({ kind: "lembur", title: "Lembur — Kamis", detail: `${fmtH(hours)} jam`, status: "Menunggu" });
          navigate("/requests/lembur/sent", { state: { hours } });
        }}
      >
        {over ? "Kurangi jam untuk melanjutkan" : "Kirim Pengajuan"}
      </Button>
    </div>
  );
}

// ── LEMBUR · sent (awaiting sign-off) ────────────────────────────
export function LemburSentScreen() {
  const location = useLocation();
  const hours: number = location.state?.hours ?? 2;
  return (
    <SentScaffold
      icon={bigClock}
      title="Lembur diajukan"
      sub="Menunggu kunci tanda tangan Koordinator Personalia sebelum payout dihitung."
    >
      <SummaryCard>
        <Row k="Tanggal" v="Kamis, 11 Jun" />
        <Row k="Durasi" v={`${fmtH(hours)} jam`} />
        <Row k="Tarif" v="1/173 gaji pokok" />
        <Row k="Status" v="Menunggu sign-off" last />
      </SummaryCard>
    </SentScaffold>
  );
}
