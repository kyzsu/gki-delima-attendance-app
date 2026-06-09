export function BrandMark({ size = 48, radius }: { size?: number; radius?: number }) {
  const r = radius ?? size * 0.32;
  const bar = size * 0.12;
  return (
    <div
      className="flex items-center justify-center shrink-0 relative"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: "var(--grad)",
        boxShadow: "0 6px 16px var(--glow)",
      }}
    >
      <div className="absolute bg-white" style={{ width: bar, height: size * 0.5, borderRadius: 99 }} />
      <div className="absolute bg-white" style={{ width: size * 0.4, height: bar, borderRadius: 99, top: size * 0.34 }} />
    </div>
  );
}
