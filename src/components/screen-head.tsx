import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ic } from "@/components/icons";

/** Back/close header used across attendance & request screens. */
export function ScreenHead({
  title,
  sub,
  close,
  to,
}: {
  title: string;
  sub?: string;
  close?: boolean;
  to?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="mb-[18px]">
      <Button
        variant="back"
        aria-label={close ? "Tutup" : "Kembali"}
        onClick={() => (to ? navigate(to) : navigate(-1))}
      >
        {close ? Ic.x : Ic.chevL}
      </Button>
      <h1 className="text-[24px] font-extrabold text-ink mt-4 mb-[5px] tracking-[-0.4px]">{title}</h1>
      {sub && <p className="text-[14px] text-muted m-0 leading-[1.45]">{sub}</p>}
    </div>
  );
}

/** Signup-flow header with 3-step progress bar. */
export function StepHead({
  step,
  title,
  sub,
  backTo,
}: {
  step: 1 | 2 | 3;
  title: string;
  sub: string;
  backTo?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="mb-[22px]">
      <Button variant="back" aria-label="Kembali" onClick={() => (backTo ? navigate(backTo) : navigate(-1))}>
        {Ic.chevL}
      </Button>
      <div className="flex gap-[6px] mt-[18px] mb-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[5px] flex-1 rounded-full"
            style={{ background: i <= step ? "var(--grad)" : "var(--line)" }}
          />
        ))}
      </div>
      <div className="text-[12.5px] font-bold text-primary tracking-[0.4px] mb-[6px]">
        LANGKAH {step} DARI 3
      </div>
      <h1 className="text-[25px] font-extrabold text-ink mb-[6px] tracking-[-0.4px]">{title}</h1>
      <p className="text-[14px] text-muted m-0 leading-[1.45]">{sub}</p>
    </div>
  );
}
