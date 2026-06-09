import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ic } from "@/components/icons";
import { fmtDateShort, fmtTime } from "@/app/store";

function TimelineRow({
  state,
  title,
  sub,
  last,
}: {
  state: "done" | "active" | "pending";
  title: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-[14px]">
      <div className="flex flex-col items-center">
        <div
          className="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center"
          style={{
            background: state === "done" ? "var(--grad)" : state === "active" ? "var(--tint2)" : "transparent",
            border: state === "pending" ? "2px solid var(--line2)" : "none",
            color: state === "done" ? "#fff" : "var(--primary)",
          }}
        >
          {state === "done" ? Ic.check : state === "active" ? <div className="gki-pulse" /> : null}
        </div>
        {!last && (
          <div
            className="w-[2px] flex-1 min-h-[26px] my-1"
            style={{ background: state === "done" ? "var(--grad)" : "var(--line)" }}
          />
        )}
      </div>
      <div style={{ paddingBottom: last ? 0 : 16 }}>
        <div className="text-[14.5px] font-bold" style={{ color: state === "pending" ? "var(--muted)" : "var(--text)" }}>
          {title}
        </div>
        <div className="text-[12.5px] text-muted mt-[2px] leading-[1.4]">{sub}</div>
      </div>
    </div>
  );
}

export function ApprovalScreen() {
  const navigate = useNavigate();
  const now = React.useMemo(() => new Date(), []);
  // Simulated admin approval for the demo build.
  React.useEffect(() => {
    const t = setTimeout(() => navigate("/signup/success"), 4500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex flex-col flex-1 bg-bg items-center text-center px-7 pt-[78px] pb-11">
      <div className="w-24 h-24 rounded-full bg-tint2 flex items-center justify-center text-primary mb-[22px]">
        <div className="w-16 h-16 rounded-full text-white flex items-center justify-center" style={{ background: "var(--grad)" }}>
          {Ic.clock}
        </div>
      </div>
      <h1 className="text-[25px] font-extrabold text-ink mb-2 tracking-[-0.4px]">Pendaftaran terkirim</h1>
      <p className="text-[14.5px] text-muted mb-7 leading-[1.5] max-w-[280px]">
        Akun Anda sedang menunggu persetujuan admin kepegawaian. Kami akan memberi tahu lewat email.
      </p>

      <div className="w-full bg-card rounded-[20px] px-5 py-[22px] text-left border border-line shadow-[0_4px_18px_rgba(80,20,80,0.05)]">
        <TimelineRow state="done" title="Data terkirim" sub={`${fmtDateShort(now)}, ${fmtTime(now)}`} />
        <TimelineRow state="active" title="Menunggu persetujuan admin" sub="Biasanya 1×24 jam kerja" />
        <TimelineRow state="pending" title="Akun aktif" sub="Anda dapat mulai presensi" last />
      </div>

      <div className="flex-1 min-h-5" />
      <Button variant="outline">Hubungi Admin</Button>
    </div>
  );
}
