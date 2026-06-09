import { Button } from "@/components/ui/button";
import { RIc } from "@/components/icons";

export function Stepper({
  value,
  onDec,
  onInc,
  suffix,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="step" onClick={onDec} aria-label="Kurangi">{RIc.minus}</Button>
      <span className="min-w-[54px] text-center text-[17px] font-extrabold text-ink tabular-nums">
        {value.toLocaleString("id-ID")}
        {suffix && <span className="text-[13px] text-muted font-bold">{suffix}</span>}
      </span>
      <Button variant="step" onClick={onInc} aria-label="Tambah">{RIc.plus}</Button>
    </div>
  );
}
