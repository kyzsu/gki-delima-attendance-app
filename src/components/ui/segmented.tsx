import type { ReactNode } from "react";

export interface SegOption<T extends string> {
  v: T;
  label: string;
  icon?: ReactNode;
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 bg-tint p-1 rounded-[13px]">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className="flex-1 flex items-center justify-center gap-[6px] p-[10px] rounded-[10px] cursor-pointer font-sans text-[13px] font-bold border-none transition-colors"
            style={{
              background: active ? "#fff" : "transparent",
              color: active ? "var(--primary)" : "var(--muted)",
              boxShadow: active ? "0 2px 6px rgba(80,20,80,0.08)" : "none",
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
