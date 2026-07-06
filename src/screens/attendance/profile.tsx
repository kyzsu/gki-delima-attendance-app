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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] font-bold text-muted uppercase tracking-[0.3px] mb-2 mt-5">{children}</div>;
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, leaveBalance, logout } = useApp();
  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-safe-58 pb-[100px]">
      {/* header — name + role + unit, avatar on the right */}
      <div className="flex items-start gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-extrabold text-ink leading-[1.15] tracking-[-0.4px]">{user.name}</h1>
          <div className="text-[13px] text-muted font-semibold mt-[6px]">{POSITION_LABEL[user.position]}</div>
          <div className="text-[13px] text-muted font-semibold">{CHURCH.name}</div>
        </div>
        <div
          className="w-[64px] h-[64px] rounded-full text-white flex items-center justify-center font-extrabold text-[22px] shrink-0"
          style={{ background: "var(--grad)", boxShadow: "0 10px 24px var(--glow)" }}
        >
          {user.initials}
        </div>
      </div>

      <SectionLabel>Informasi pribadi</SectionLabel>
      <SummaryCard>
        <Row k="Nama" v={user.name} />
        <Row k="Email" v={user.email} />
        <Row k="Telepon" v={user.phone || "—"} />
        <Row k="NIP" v={user.nip || "—"} last />
      </SummaryCard>

      <SectionLabel>Kepegawaian</SectionLabel>
      <SummaryCard>
        <Row k="Unit kerja" v={CHURCH.name} />
        <Row k="Posisi" v={POSITION_LABEL[user.position]} />
        <Row k="Saldo cuti tahunan" v={`${leaveBalance} hari`} />
        <Row k="Status akun" v="Aktif" last />
      </SummaryCard>

      <SectionLabel>Pengaturan</SectionLabel>
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
