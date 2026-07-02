import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldLabel, PseudoField } from "@/components/ui/field";
import { Seg } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { SummaryCard, Row } from "@/components/ui/summary-card";
import { ScreenHead } from "@/components/screen-head";
import { FormScreen } from "@/components/form-screen";
import { SentScaffold } from "@/components/sent-scaffold";
import { Ic, RIc, bigCheck } from "@/components/icons";
import { Note } from "@/components/ui/note";
import { useApp, dateStr } from "@/app/store";
import { fmtIDR } from "@/lib/utils";

const fmtD = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const DEST = [
  { v: "Jakarta", jabo: true },
  { v: "Bogor", jabo: true },
  { v: "Depok", jabo: true },
  { v: "Tangerang", jabo: true },
  { v: "Bekasi", jabo: true },
  { v: "Bandung", jabo: false },
  { v: "Semarang", jabo: false },
  { v: "Surabaya", jabo: false },
  { v: "Medan", jabo: false },
];

// ── TRIP · 1 — destination triggers the Jabodetabek perimeter ───
export function TripFormScreen() {
  const navigate = useNavigate();
  const { submitTrip } = useApp();
  const [dest, setDest] = React.useState("Jakarta");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inside = DEST.find((d) => d.v === dest)!.jabo;
  const depart = new Date();

  async function submit() {
    if (!inside) {
      // Carry the keterangan through to the allowance step.
      navigate("/requests/trip/allowance", { state: { dest, note } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitTrip({ dest, departDate: dateStr(depart), note: note.trim() || undefined });
      navigate("/requests/trip/sent", { state: { dest, total: 0, nights: 0 } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <FormScreen
      head={<ScreenHead title="Perjalanan Dinas" sub="Tujuan menentukan tunjangan otomatis." close to="/requests" />}
      footer={
        <>
          {error && (
            <div className="mb-3">
              <Note tone="danger" icon={Ic.alert}>{error}</Note>
            </div>
          )}
          <Button variant="primary" disabled={busy} onClick={submit}>
            {busy ? "Mengirim…" : inside ? "Kirim Pengajuan" : "Lanjut ke Tunjangan"}
          </Button>
        </>
      }
    >
      <FieldLabel upper hint="memicu perimeter Jabodetabek">Tujuan</FieldLabel>
      <div className="gki-field mb-[14px] !p-0">
        <span className="text-muted flex pl-[14px]">{Ic.pin}</span>
        <select
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          className="flex-1 border-none outline-none bg-transparent text-[14.5px] font-sans text-ink font-semibold py-[13px] pr-[14px] pl-2 appearance-none cursor-pointer"
        >
          {DEST.map((d) => (
            <option key={d.v} value={d.v}>
              {d.v}{d.jabo ? " (Jabodetabek)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-[10px] mb-[14px]">
        <div className="flex-1">
          <FieldLabel upper>Berangkat</FieldLabel>
          <PseudoField icon={Ic.calendar}>{fmtD(depart)}</PseudoField>
        </div>
        <div className="flex-1">
          <FieldLabel upper>Kembali</FieldLabel>
          <PseudoField icon={Ic.calendar}>{fmtD(inside ? depart : addDays(depart, 2))}</PseudoField>
        </div>
      </div>

      <div
        className="flex gap-3 items-center rounded-[14px] px-[15px] py-[14px]"
        style={{
          background: inside ? "var(--tint)" : "var(--tint2)",
          border: inside ? "1px solid var(--line)" : "1px solid var(--primary)",
        }}
      >
        <span className="flex" style={{ color: inside ? "var(--muted)" : "var(--primary)" }}>{RIc.route}</span>
        <div className="flex-1">
          <div className="text-[13px] font-extrabold" style={{ color: inside ? "var(--muted)" : "var(--primary)" }}>
            {inside ? "Dalam Jabodetabek" : "Luar kota — luar Jabodetabek"}
          </div>
          <div className="text-[11.5px] text-muted mt-[2px] leading-[1.4]">
            {inside ? "Tidak memicu tunjangan luar kota." : "Memicu injeksi tunjangan otomatis."}
          </div>
        </div>
      </div>

      <div className="mt-[14px]">
        <FieldLabel upper hint="tujuan perjalanan">Keterangan</FieldLabel>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="cth. Antar paduan suara Gabriel ke GKI Bromo"
          className="w-full rounded-[14px] border border-line2 bg-card px-4 py-[11px] text-[14px] text-ink font-sans outline-none focus:border-primary resize-none"
        />
      </div>

    </FormScreen>
  );
}

// ── TRIP · 2 — automatic allowance injection ────────────────────
function AllowRow({ icon, k, sub, v }: { icon: React.ReactNode; k: string; sub: string; v: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-line">
      <span className="w-[34px] h-[34px] rounded-[10px] bg-tint text-primary flex items-center justify-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-extrabold text-ink">{k}</div>
        <div className="text-[11px] text-muted">{sub}</div>
      </div>
      <span className="text-[13.5px] font-extrabold text-ink tabular-nums">{v}</span>
    </div>
  );
}

const RATES = { meal: 75000, transport: 150000, lodging: 350000 };

export function TripAllowanceScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { submitTrip } = useApp();
  const dest: string = location.state?.dest ?? "Bandung";
  const note: string = location.state?.note ?? "";

  const [overnight, setOvernight] = React.useState<"none" | "over">("over");
  const [nights, setNights] = React.useState(2);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isOver = overnight === "over";
  // Preview only — the server recomputes the allowance on submit.
  const transport = RATES.transport * (isOver ? 2 : 1);
  const meals = isOver ? RATES.meal * (nights + 1) : RATES.meal;
  const lodging = isOver ? RATES.lodging * nights : 0;
  const total = transport + meals + lodging;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await submitTrip({
        dest,
        departDate: dateStr(new Date()),
        overnight: isOver,
        ...(isOver ? { nights } : {}),
        note: note.trim() || undefined,
      });
      navigate("/requests/trip/sent", {
        state: { dest, total: res.allowance.total, nights: res.nights },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <FormScreen
      head={<ScreenHead title="Tunjangan Dinas" sub={`${dest} · luar Jabodetabek`} />}
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
      <FieldLabel upper>Status menginap</FieldLabel>
      <div className="mb-[14px]">
        <Seg
          value={overnight}
          onChange={setOvernight}
          options={[
            { v: "none", label: "Tanpa Inap", icon: RIc.sun },
            { v: "over", label: "Wajib Inap", icon: RIc.bed },
          ]}
        />
      </div>

      {isOver && (
        <div className="flex justify-between items-center bg-tint rounded-[13px] px-4 py-[11px] mb-4">
          <span className="text-[13px] font-bold text-ink">Jumlah malam</span>
          <Stepper value={nights} onDec={() => setNights((n) => Math.max(1, n - 1))} onInc={() => setNights((n) => Math.min(7, n + 1))} />
        </div>
      )}

      <div
        className="bg-card rounded-[18px] px-[18px] pt-[6px] pb-4"
        style={{ border: "1px solid var(--primary)", boxShadow: "0 4px 18px rgba(193,58,214,0.08)" }}
      >
        <div className="flex items-center gap-2 pt-[14px] pb-1 text-primary">
          {RIc.wallet}
          <span className="text-[13.5px] font-extrabold text-ink">Injeksi tunjangan otomatis</span>
        </div>
        <AllowRow icon={RIc.car} k="Transport" sub={isOver ? "PP (2×)" : "Sekali jalan"} v={fmtIDR(transport)} />
        <AllowRow icon={RIc.food} k="Uang makan" sub={isOver ? `${nights + 1} hari` : "1 hari"} v={fmtIDR(meals)} />
        {isOver && <AllowRow icon={RIc.bed} k="Akomodasi" sub={`${nights} malam`} v={fmtIDR(lodging)} />}
        <div className="flex justify-between items-center pt-[14px]">
          <span className="text-[13.5px] font-extrabold text-ink">Total tunjangan</span>
          <span className="text-[18px] font-extrabold text-primary tabular-nums">{fmtIDR(total)}</span>
        </div>
      </div>

    </FormScreen>
  );
}

// ── TRIP · 3 — sent ─────────────────────────────────────────────
export function TripSentScreen() {
  const location = useLocation();
  const dest: string = location.state?.dest ?? "Bandung";
  const total: number = location.state?.total ?? 1025000;
  const nights: number = location.state?.nights ?? 2;
  return (
    <SentScaffold
      icon={bigCheck}
      title="Pengajuan dinas terkirim"
      sub="Tunjangan akan dicairkan setelah disetujui Koordinator Personalia."
    >
      <SummaryCard>
        <Row k="Tujuan" v={dest} />
        <Row k="Durasi" v={nights > 0 ? `${nights + 1} hari · ${nights} malam` : "1 hari"} />
        <Row k="Total tunjangan" v={total > 0 ? fmtIDR(total) : "—"} />
        <Row k="Status" v="Menunggu persetujuan" last />
      </SummaryCard>
    </SentScaffold>
  );
}
