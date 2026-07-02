import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SummaryCard, Row } from "@/components/ui/summary-card";
import { ScreenHead } from "@/components/screen-head";
import { StatusBanner, InfoChip } from "@/components/status-banner";
import { GeoMap } from "@/components/geo-map";
import { Ic } from "@/components/icons";
import { useApp, fmtTime, fmtDateLong, CHURCH } from "@/app/store";

// ── Success (check-in / check-out) ───────────────────────────────
export function CheckSuccessScreen({ mode }: { mode: "in" | "out" }) {
  const navigate = useNavigate();
  const { user, checkInAt, checkOutAt, lastDistanceM } = useApp();
  const firstName = user.name.split(" ")[0];
  const isIn = mode === "in";
  const dur =
    checkInAt && checkOutAt
      ? (() => {
          const m = Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 60000);
          return `${String(Math.floor(m / 60)).padStart(2, "0")} jam ${String(m % 60).padStart(2, "0")} mnt`;
        })()
      : "—";

  return (
    <div className="flex flex-col flex-1 bg-bg items-center text-center px-6 pt-[70px] pb-10">
      <div className="w-[104px] h-[104px] rounded-full bg-tint2 flex items-center justify-center mb-[22px]">
        <div className="gki-pop w-[72px] h-[72px] rounded-full text-white flex items-center justify-center" style={{ background: "var(--grad)" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
        </div>
      </div>
      <h1 className="text-[25px] font-extrabold text-ink mb-[6px] tracking-[-0.4px]">
        {isIn ? "Presensi berhasil!" : "Presensi pulang tercatat!"}
      </h1>
      <p className="text-[14.5px] text-muted mb-6 leading-[1.5] max-w-[270px]">
        {isIn
          ? `Kehadiran Anda sudah tercatat. Selamat bekerja, ${firstName}.`
          : `Terima kasih atas kerja Anda hari ini, ${firstName}. Sampai jumpa besok!`}
      </p>

      <SummaryCard className="w-full rounded-[20px]">
        {isIn ? (
          <>
            <Row k="Jenis" v="Masuk" />
            <Row k="Waktu" v={checkInAt ? `${fmtTime(checkInAt)} WIB` : "—"} />
            <Row k="Tanggal" v={fmtDateLong(new Date())} />
            <Row k="Lokasi" v={CHURCH.name} />
            <Row k="Jarak" v={`±${lastDistanceM} m dari titik`} last />
          </>
        ) : (
          <>
            <Row k="Jenis" v="Pulang" />
            <Row k="Jam masuk" v={checkInAt ? `${fmtTime(checkInAt)} WIB` : "—"} />
            <Row k="Jam pulang" v={checkOutAt ? `${fmtTime(checkOutAt)} WIB` : "—"} />
            <Row k="Total durasi" v={dur} />
            <Row k="Lokasi" v={CHURCH.name} last />
          </>
        )}
      </SummaryCard>

      <div className="flex-1 min-h-5" />
      <Button variant="primary" onClick={() => navigate("/home")}>Selesai</Button>
    </div>
  );
}

// ── Out of range (negative) ──────────────────────────────────────
export function OutOfRangeScreen({ mode }: { mode: "in" | "out" }) {
  const navigate = useNavigate();
  const { lastDistanceM } = useApp();
  const km = lastDistanceM >= 1000 ? `${(lastDistanceM / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${lastDistanceM} m`;
  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-safe-58 pb-10">
      <ScreenHead
        title={mode === "in" ? "Presensi Masuk" : "Presensi Pulang"}
        sub="Pastikan Anda berada di area gereja."
        close
        to="/home"
      />
      <GeoMap inRange={false} danger userPos={{ x: "88%", y: "15%" }} />
      <div className="mt-4">
        <StatusBanner danger>
          Anda berada <b>±{km}</b> dari {CHURCH.name}. Presensi hanya bisa dilakukan dalam radius 50 m.
        </StatusBanner>
      </div>
      <div className="flex gap-[10px] mt-3">
        <InfoChip icon={Ic.nav} label="Jarak Anda" value={`±${km}`} />
        <InfoChip icon={Ic.pin} label="Tujuan" value={CHURCH.name} />
      </div>
      <div className="flex-1 min-h-4" />
      <Button variant="primary" disabled className="opacity-80">Terlalu jauh untuk presensi</Button>
      <Button
        variant="outline"
        className="mt-[10px]"
        onClick={() => navigate(mode === "in" ? "/checkin/locating" : "/checkout/locating", { replace: true })}
      >
        {Ic.refresh}
        Perbarui lokasi
      </Button>
    </div>
  );
}

// ── GPS off (negative) ───────────────────────────────────────────
function HintRow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[11px]">
      <span
        className="w-6 h-6 rounded-full text-white text-[12.5px] font-extrabold flex items-center justify-center shrink-0"
        style={{ background: "var(--grad)" }}
      >
        {n}
      </span>
      <span className="text-[13.5px] text-ink font-semibold">{children}</span>
    </div>
  );
}

export function GpsOffScreen({ mode }: { mode: "in" | "out" }) {
  const navigate = useNavigate();
  const retry = () => navigate(mode === "in" ? "/checkin/locating" : "/checkout/locating", { replace: true });
  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-safe-58 pb-10">
      <ScreenHead title={mode === "in" ? "Presensi Masuk" : "Presensi Pulang"} close to="/home" />
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center mb-[22px]" style={{ background: "var(--danger-soft)", color: "#D24A66" }}>
          <div className="scale-150 flex">{Ic.gpsOff}</div>
        </div>
        <h1 className="text-[23px] font-extrabold text-ink mb-2 tracking-[-0.3px]">Lokasi tidak aktif</h1>
        <p className="text-[14.5px] text-muted m-0 leading-[1.55] max-w-[280px]">
          Aktifkan layanan lokasi (GPS) dan izinkan akses agar kami dapat memverifikasi Anda berada di {CHURCH.name}.
        </p>
        <div className="w-full mt-[22px] bg-tint rounded-[16px] px-4 py-[15px] text-left flex flex-col gap-[10px]">
          <HintRow n="1">Buka Pengaturan ponsel</HintRow>
          <HintRow n="2">Aktifkan Lokasi / GPS</HintRow>
          <HintRow n="3">Izinkan akses lokasi untuk aplikasi ini</HintRow>
        </div>
      </div>
      <Button variant="primary" onClick={retry}>Aktifkan Lokasi</Button>
      <Button variant="outline" className="mt-[10px]" onClick={retry}>
        {Ic.refresh}
        Coba lagi
      </Button>
    </div>
  );
}
