export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className="relative w-[46px] h-[26px] rounded-full border-none cursor-pointer shrink-0 transition-colors duration-200 p-0"
      style={{ background: checked ? "var(--primary)" : "var(--line2)" }}
    >
      <span
        className="absolute top-[2px] left-0 w-[22px] h-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}
