import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SummaryCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "bg-card border border-line rounded-[18px] px-[18px] py-[6px] shadow-[0_4px_18px_rgba(80,20,80,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Row({ k, v, last }: { k: string; v: ReactNode; last?: boolean }) {
  return (
    <div
      className={cn(
        "flex justify-between items-center py-[13px]",
        !last && "border-b border-line",
      )}
    >
      <span className="text-[13.5px] text-muted font-semibold">{k}</span>
      <span className="text-[13.5px] text-ink font-extrabold">{v}</span>
    </div>
  );
}
