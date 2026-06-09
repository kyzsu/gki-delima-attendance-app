import type { ReactNode } from "react";
import { Ic } from "@/components/icons";

export function StatusBanner({
  ok,
  danger,
  children,
}: {
  ok?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  const bg = ok ? "var(--tint2)" : danger ? "var(--danger-soft)" : "var(--tint)";
  const fg = ok ? "var(--primary)" : danger ? "var(--danger)" : "var(--muted)";
  return (
    <div
      className="flex items-center gap-[10px] rounded-[14px] px-[15px] py-[13px] text-[13.5px] font-semibold leading-[1.4]"
      style={{ background: bg, color: fg }}
    >
      <span className="flex shrink-0">{ok ? Ic.shield : Ic.alert}</span>
      <span>{children}</span>
    </div>
  );
}

export function InfoChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex-1 bg-card border border-line rounded-[14px] px-[13px] py-[11px] flex items-center gap-[10px]">
      <span className="w-8 h-8 rounded-[10px] bg-tint text-primary flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted font-semibold">{label}</div>
        <div className="text-[13.5px] font-extrabold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
          {value}
        </div>
      </div>
    </div>
  );
}
