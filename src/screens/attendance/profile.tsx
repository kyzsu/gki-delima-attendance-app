import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SummaryCard, Row } from "@/components/ui/summary-card";
import { TabBar } from "@/components/tab-bar";
import { Ic } from "@/components/icons";
import { useApp, CHURCH } from "@/app/store";

export const POSITION_LABEL = {
  tata_usaha: "Tata Usaha",
  sopir: "Sopir",
  koster: "Koster & Pembantu Koster",
} as const;

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, leaveBalance, logout } = useApp();
  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-safe-58 pb-[100px]">
      <h1 className="text-[24px] font-extrabold text-ink mb-[18px] tracking-[-0.4px]">Profil</h1>
      <div className="flex flex-col items-center mb-[22px]">
        <div
          className="w-[84px] h-[84px] rounded-full text-white flex items-center justify-center font-extrabold text-[28px]"
          style={{ background: "var(--grad)", boxShadow: "0 10px 24px var(--glow)" }}
        >
          {user.initials}
        </div>
        <div className="text-[17px] font-extrabold text-ink mt-3">{user.name}</div>
        <div className="text-[12.5px] text-muted font-semibold">{user.email}</div>
      </div>

      <SummaryCard>
        <Row k="Unit kerja" v={CHURCH.name} />
        <Row k="Posisi" v={POSITION_LABEL[user.position]} />
        <Row k="Saldo cuti tahunan" v={`${leaveBalance} hari`} />
        <Row k="Status akun" v="Aktif" last />
      </SummaryCard>

      <div className="flex-1 min-h-4" />
      <Button variant="outline" className="mb-[10px]" onClick={() => navigate("/change-password")}>
        Ubah Kata Sandi
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          logout();
          navigate("/");
        }}
      >
        {Ic.logout}
        Keluar
      </Button>
      <TabBar />
    </div>
  );
}
