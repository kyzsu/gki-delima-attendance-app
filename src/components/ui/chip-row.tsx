import type { ReactNode } from "react";

export interface ChipOption<T extends string> {
  v: T;
  label: string;
  icon?: ReactNode;
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="gki-noscroll flex gap-2 overflow-x-auto -mx-[2px] px-[2px] pb-1">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className="shrink-0 w-20 flex flex-col items-center gap-[7px] px-[6px] py-3 rounded-[15px] cursor-pointer font-sans transition-colors"
            style={{
              border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--line)",
              background: active ? "var(--tint2)" : "var(--card)",
              color: active ? "var(--primary)" : "var(--muted)",
            }}
          >
            <span className="flex">{o.icon}</span>
            <span className="text-[10.5px] font-extrabold leading-[1.15] text-center">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
