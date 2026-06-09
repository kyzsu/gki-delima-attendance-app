import type { ReactNode } from "react";

const tones = {
  ok: { bg: "var(--tint2)", fg: "var(--primary)" },
  danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  warn: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  info: { bg: "var(--tint)", fg: "var(--muted)" },
} as const;

export function Note({
  tone = "info",
  icon,
  children,
}: {
  tone?: keyof typeof tones;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const c = tones[tone];
  return (
    <div
      className="flex gap-[9px] items-start rounded-[13px] px-[13px] py-3"
      style={{ background: c.bg, color: c.fg }}
    >
      {icon && <span className="flex shrink-0 mt-px">{icon}</span>}
      <span className="text-[12.5px] font-semibold leading-[1.45]">{children}</span>
    </div>
  );
}
