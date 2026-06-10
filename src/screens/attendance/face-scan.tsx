import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ic } from "@/components/icons";
import { useApp } from "@/app/store";
import { ApiError } from "@/lib/api";

/** Face verification — uses the front camera when available, falls back to a placeholder. */
export function FaceScanScreen({ mode }: { mode: "in" | "out" }) {
  const navigate = useNavigate();
  const { checkIn, checkOut, setLastDistanceM } = useApp();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [cameraOk, setCameraOk] = React.useState(false);

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          setCameraOk(true);
        }
      })
      .catch(() => setCameraOk(false));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // The face match itself is simulated; the attendance API call is real.
  // Both the scan animation and the request must finish before navigating.
  React.useEffect(() => {
    let alive = true;
    const base = mode === "in" ? "/checkin" : "/checkout";
    const animation = new Promise((r) => setTimeout(r, 3200));
    const record = mode === "in" ? checkIn() : checkOut();

    Promise.all([record, animation])
      .then(() => {
        if (alive) navigate(`${base}/success`, { replace: true });
      })
      .catch(async (err) => {
        await animation;
        if (!alive) return;
        if (err instanceof ApiError && err.body.reason === "out-of-range") {
          if (typeof err.body.distanceM === "number") setLastDistanceM(err.body.distanceM);
          navigate(`${base}/out-of-range`, { replace: true });
        } else if (err instanceof ApiError && err.body.reason === "gps-off") {
          navigate(`${base}/gps-off`, { replace: true });
        } else {
          // Already recorded today, session expired, server down, … — Home
          // shows the authoritative state.
          navigate("/home", { replace: true });
        }
      });
    return () => {
      alive = false;
    };
  }, [mode, checkIn, checkOut, navigate, setLastDistanceM]);

  return (
    <div
      className="flex flex-col flex-1 relative overflow-hidden items-center text-center px-6 pt-[58px] pb-10"
      style={{ background: "var(--grad-hero)" }}
    >
      <div className="absolute rounded-full" style={{ top: -70, right: -60, width: 220, height: 220, background: "rgba(255,255,255,0.12)", filter: "blur(6px)" }} />
      <Button
        variant="back"
        aria-label="Batalkan"
        className="self-start relative text-white bg-white/15 hover:bg-white/25"
        onClick={() => navigate("/home")}
      >
        {Ic.x}
      </Button>
      <h1 className="text-white text-[23px] font-extrabold mt-5 mb-[6px] relative">Verifikasi wajah</h1>
      <p className="text-white/85 text-[14px] m-0 leading-[1.45] relative max-w-[250px]">
        Posisikan wajah di dalam bingkai.
      </p>

      <div className="flex-1 flex items-center justify-center relative">
        <div className="relative w-[230px] h-[230px]">
          <div className="absolute inset-0 rounded-full overflow-hidden bg-white/15 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
              style={{ display: cameraOk ? "block" : "none" }}
            />
            {!cameraOk && <span className="text-white/80 text-[13px] font-bold">Wajah</span>}
          </div>
          <div className="gki-scanring absolute -inset-2 rounded-full border-[3px] border-dashed border-white/70" />
          <div className="gki-scanline" />
        </div>
      </div>

      <div className="relative flex items-center gap-2 text-white text-[14px] font-bold bg-white/15 px-[18px] py-[11px] rounded-full">
        <span className="gki-pulse" style={{ background: "#fff", boxShadow: "none" }} />
        Memindai wajah…
      </div>
    </div>
  );
}
