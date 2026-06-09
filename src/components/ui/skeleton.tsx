import type { CSSProperties } from "react";

export function Sk({
  w,
  h,
  r = 8,
  style,
}: {
  w: number | string;
  h: number | string;
  r?: number;
  style?: CSSProperties;
}) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}
