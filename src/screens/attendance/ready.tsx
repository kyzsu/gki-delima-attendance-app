import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScreenHead } from "@/components/screen-head";
import { StatusBanner, InfoChip } from "@/components/status-banner";
import { GeoMap } from "@/components/geo-map";
import { Ic } from "@/components/icons";
import { useApp, fmtTime, CHURCH } from "@/app/store";

export function CheckReadyScreen({ mode }: { mode: "in" | "out" }) {
  const navigate = useNavigate();
  const { lastDistanceM, checkInAt } = useApp();
  const isIn = mode === "in";
  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-[58px] pb-10">
      <ScreenHead
        title={isIn ? "Presensi Masuk" : "Presensi Pulang"}
        sub={isIn ? "Pastikan Anda berada di area gereja." : "Pastikan Anda masih di area gereja."}
        close
        to="/home"
      />
      <GeoMap inRange userPos={isIn ? { x: "58%", y: "44%" } : { x: "46%", y: "60%" }} />
      <div className="mt-4">
        <StatusBanner ok>
          Anda berada di area {CHURCH.name} — <b>±{lastDistanceM} m</b> dari titik gereja.
        </StatusBanner>
      </div>
      <div className="flex gap-[10px] mt-3">
        {isIn ? (
          <>
            <InfoChip icon={Ic.pin} label="Lokasi" value={CHURCH.name} />
            <InfoChip icon={Ic.clock} label="Waktu" value={`${fmtTime(new Date())} WIB`} />
          </>
        ) : (
          <>
            <InfoChip icon={Ic.login} label="Jam masuk" value={checkInAt ? `${fmtTime(checkInAt)} WIB` : "—"} />
            <InfoChip icon={Ic.clock} label="Sekarang" value={`${fmtTime(new Date())} WIB`} />
          </>
        )}
      </div>
      <div className="flex-1 min-h-4" />
      <Button variant="primary" onClick={() => navigate(isIn ? "/checkin/face" : "/checkout/face")}>
        {isIn ? "Verifikasi Wajah & Masuk" : "Verifikasi Wajah & Pulang"}
      </Button>
    </div>
  );
}
