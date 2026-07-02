import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sk } from "@/components/ui/skeleton";
import { ScreenHead } from "@/components/screen-head";
import { Ic } from "@/components/icons";
import { checkLocation, useApp } from "@/app/store";

/** Shared "Mendeteksi lokasi…" screen for check-in & check-out.
 *  Dev override: append ?force=far or ?force=gpsoff to preview failure states. */
export function LocatingScreen({ mode }: { mode: "in" | "out" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setLastDistanceM, setLastPos, setPendingLoc } = useApp();
  const base = mode === "in" ? "/checkin" : "/checkout";

  React.useEffect(() => {
    let alive = true;
    const started = Date.now();
    checkLocation(params.get("force")).then((res) => {
      const wait = Math.max(0, 2200 - (Date.now() - started));
      setTimeout(() => {
        if (!alive) return;
        if (res.kind === "gps-off") {
          setLastPos(null);
          navigate(`${base}/gps-off`, { replace: true });
        } else if (res.kind === "out-of-range") {
          setLastDistanceM(res.distanceM);
          setLastPos(res.lat != null && res.lng != null ? { lat: res.lat, lng: res.lng } : null);
          navigate(`${base}/out-of-range`, { replace: true });
        } else {
          // Hand the verified coordinates to the check-in/out API call.
          setPendingLoc({ lat: res.lat, lng: res.lng });
          setLastDistanceM(res.distanceM);
          setLastPos(res.lat != null && res.lng != null ? { lat: res.lat, lng: res.lng } : null);
          navigate(`${base}/ready`, { replace: true });
        }
      }, wait);
    });
    return () => {
      alive = false;
    };
  }, [base, navigate, params, setLastDistanceM, setLastPos, setPendingLoc]);

  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-safe-58 pb-10">
      <ScreenHead
        title={mode === "in" ? "Presensi Masuk" : "Presensi Pulang"}
        sub="Sedang memeriksa posisi Anda…"
        close
        to="/home"
      />
      {/* radar map */}
      <div
        className="relative h-[230px] rounded-[22px] overflow-hidden border border-line"
        style={{ background: "linear-gradient(135deg,#F3ECF6 0%,#EFE6F4 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(#e4d6ea 2px, transparent 2px), linear-gradient(90deg,#e4d6ea 2px, transparent 2px)",
            backgroundSize: "46px 46px",
            backgroundPosition: "-8px -2px",
          }}
        />
        <div className="gki-radar" />
        <div className="gki-radar" style={{ animationDelay: "0.8s" }} />
        <div className="gki-radar" style={{ animationDelay: "1.6s" }} />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-full text-white flex items-center justify-center"
          style={{ background: "var(--grad)", boxShadow: "0 6px 14px var(--glow)" }}
        >
          {Ic.nav}
        </div>
      </div>
      <Sk w="100%" h={48} r={14} style={{ marginTop: 16 }} />
      <div className="flex gap-[10px] mt-3">
        <Sk w="100%" h={56} r={14} style={{ flex: 1 }} />
        <Sk w="100%" h={56} r={14} style={{ flex: 1 }} />
      </div>
      <div className="flex-1 min-h-4" />
      <Button variant="primary" disabled className="cursor-progress">
        <span className="gki-spin" />
        Mendeteksi lokasi…
      </Button>
    </div>
  );
}
