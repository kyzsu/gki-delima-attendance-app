import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Success/sent confirmation scaffold shared by cuti/dinas/lembur flows. */
export function SentScaffold({
  icon,
  title,
  sub,
  children,
  doneTo = "/requests",
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  children?: ReactNode;
  doneTo?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col flex-1 bg-bg items-center text-center px-6 pt-[74px] pb-10">
      <div className="w-[100px] h-[100px] rounded-full bg-tint2 flex items-center justify-center mb-[22px]">
        <div
          className="gki-pop w-[68px] h-[68px] rounded-full text-white flex items-center justify-center"
          style={{ background: "var(--grad)" }}
        >
          {icon}
        </div>
      </div>
      <h1 className="text-[24px] font-extrabold text-ink mb-[7px] tracking-[-0.4px]">{title}</h1>
      <p className="text-[14px] text-muted mb-6 leading-[1.5] max-w-[280px]">{sub}</p>
      <div className="w-full">{children}</div>
      <div className="flex-1 min-h-5" />
      <Button variant="primary" onClick={() => navigate(doneTo)}>Selesai</Button>
    </div>
  );
}
