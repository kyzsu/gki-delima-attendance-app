import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function SuccessScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { name } = (location.state ?? {}) as { name?: string };
  const firstName = (name ?? "Karyawan").split(" ")[0];
  return (
    <div
      className="flex flex-col flex-1 relative overflow-hidden items-center text-center px-7 pb-11"
      style={{ background: "var(--grad-hero)" }}
    >
      <div className="absolute rounded-full" style={{ top: -70, left: -50, width: 220, height: 220, background: "rgba(255,255,255,0.14)", filter: "blur(10px)" }} />
      <div className="absolute rounded-full" style={{ bottom: 90, right: -80, width: 220, height: 220, background: "rgba(255,255,255,0.10)", filter: "blur(8px)" }} />

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="w-[108px] h-[108px] rounded-full bg-white/20 flex items-center justify-center mb-[26px]">
          <div className="gki-pop w-[76px] h-[76px] rounded-full bg-white text-primary flex items-center justify-center">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
          </div>
        </div>
        <h1 className="text-white text-[28px] font-extrabold mb-2 tracking-[-0.5px]">Akun Anda aktif!</h1>
        <p className="text-white/85 text-[15px] m-0 leading-[1.55] max-w-[270px]">
          Selamat datang di GKI Delima, {firstName}. Anda siap mencatat kehadiran setiap hari.
        </p>
      </div>

      <div className="relative flex flex-col gap-3 w-full">
        <Button variant="light" onClick={() => navigate("/login")}>Masuk &amp; Mulai Presensi</Button>
      </div>
    </div>
  );
}
