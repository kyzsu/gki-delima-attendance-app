import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

export function SplashScreen() {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col flex-1 relative overflow-hidden px-7 pb-11"
      style={{ background: "var(--grad-hero)" }}
    >
      {/* soft glow blobs */}
      <div className="absolute rounded-full" style={{ top: -80, right: -60, width: 240, height: 240, background: "rgba(255,255,255,0.16)", filter: "blur(10px)" }} />
      <div className="absolute rounded-full" style={{ bottom: 120, left: -90, width: 220, height: 220, background: "rgba(255,255,255,0.10)", filter: "blur(8px)" }} />

      <div className="flex-1 flex flex-col items-center justify-center text-center relative">
        <div className="w-[104px] h-[104px] rounded-full bg-white/15 flex items-center justify-center">
          <BrandMark size={72} radius={999} />
        </div>
        <h1 className="text-white text-[30px] font-extrabold mt-[26px] mb-1 tracking-[-0.6px]">GKI Delima</h1>
        <div className="text-white/90 text-[16px] font-semibold tracking-[1.5px] uppercase">Presensi Karyawan</div>
        <p className="text-white/80 text-[14.5px] mt-[18px] leading-[1.55] max-w-[250px]">
          Catat kehadiran harian dengan mudah, cukup dari genggaman Anda.
        </p>
      </div>

      <div className="relative flex flex-col gap-3">
        <Button variant="light" onClick={() => navigate("/signup/step-1")}>Daftar Akun Baru</Button>
        <Button variant="ghost" onClick={() => navigate("/login")}>Masuk</Button>
      </div>
    </div>
  );
}
