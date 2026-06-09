import { Ic } from "@/components/icons";

/** Stylized geofence map: 50 m ring around the church anchor. */
export function GeoMap({
  inRange,
  userPos,
  height = 230,
  danger,
}: {
  inRange: boolean;
  userPos: { x: string; y: string };
  height?: number;
  danger?: boolean;
}) {
  const ringColor = inRange ? "var(--primary)" : danger ? "var(--danger-dot)" : "var(--muted)";
  const ringFill = inRange ? "rgba(193,58,214,0.12)" : "rgba(140,120,150,0.10)";
  return (
    <div
      className="relative rounded-[22px] overflow-hidden border border-line"
      style={{ height, background: "linear-gradient(135deg,#F3ECF6 0%,#EFE6F4 100%)" }}
    >
      {/* faux streets */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(#e4d6ea 2px, transparent 2px), linear-gradient(90deg,#e4d6ea 2px, transparent 2px)",
          backgroundSize: "46px 46px",
          backgroundPosition: "-8px -2px",
        }}
      />
      <div className="absolute left-0 right-0 h-[9px]" style={{ top: "38%", background: "#e9dcee" }} />
      <div className="absolute top-0 bottom-0 w-[9px]" style={{ left: "54%", background: "#e9dcee" }} />

      {/* 50 m geofence ring */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] rounded-full"
        style={{ border: `2px dashed ${ringColor}`, background: ringFill }}
      />
      {/* church pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center text-primary">
        <div
          className="w-[34px] h-[34px] rotate-45 flex items-center justify-center"
          style={{ borderRadius: "50% 50% 50% 0", background: "var(--grad)", boxShadow: "0 6px 14px var(--glow)" }}
        >
          <div className="-rotate-45 text-white flex">{Ic.pin}</div>
        </div>
      </div>
      {/* radius label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-[10.5px] font-bold bg-white px-2 py-[2px] rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
        style={{ top: "calc(50% + 60px)", color: ringColor }}
      >
        radius 50 m
      </div>

      {/* user dot */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: userPos.x, top: userPos.y }}>
        <div className="relative w-5 h-5">
          <div className="gki-userwave" style={{ borderColor: inRange ? "var(--primary)" : "var(--danger-dot)" }} />
          <div
            className="absolute inset-0 m-auto w-[18px] h-[18px] rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            style={{ background: inRange ? "var(--primary)" : "var(--danger-dot)" }}
          />
        </div>
      </div>
    </div>
  );
}
