import * as React from "react";
import { Sk } from "@/components/ui/skeleton";
import { TabBar } from "@/components/tab-bar";
import { Ic } from "@/components/icons";
import { useApp } from "@/app/store";
import { statusChip } from "./home";

function HistorySkeleton() {
  return (
    <>
      <Sk w={150} h={22} r={8} style={{ marginBottom: 18 }} />
      <div className="flex gap-[10px] mb-[18px]">
        <Sk w="100%" h={72} r={16} style={{ flex: 1 }} />
        <Sk w="100%" h={72} r={16} style={{ flex: 1 }} />
        <Sk w="100%" h={72} r={16} style={{ flex: 1 }} />
      </div>
      <Sk w={110} h={13} style={{ marginBottom: 12 }} />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] p-[14px]">
            <Sk w={36} h={36} r={10} />
            <div className="flex-1 flex flex-col gap-[7px]">
              <Sk w={120} h={12} />
              <Sk w={80} h={10} />
            </div>
            <Sk w={48} h={18} r={99} />
          </div>
        ))}
      </div>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-card border border-line rounded-[16px] px-3 py-[13px] text-center">
      <div className="text-[19px] font-extrabold text-primary tabular-nums">{value}</div>
      <div className="text-[11px] text-muted font-semibold mt-[2px]">{label}</div>
    </div>
  );
}

export function HistoryScreen() {
  const { ready, log } = useApp();
  const [delayDone, setDelayDone] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setDelayDone(true), 900);
    return () => clearTimeout(t);
  }, []);
  const loading = !ready || !delayDone;

  const onTime = log.filter((l) => !l.late).length;
  const late = log.length - onTime;

  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-[58px] pb-[100px]">
      {loading ? (
        <HistorySkeleton />
      ) : (
        <>
          <h1 className="text-[24px] font-extrabold text-ink mb-[18px] tracking-[-0.4px]">Riwayat</h1>
          <div className="flex gap-[10px] mb-[18px]">
            <Tile label="Hadir" value={String(log.length)} />
            <Tile label="Tepat waktu" value={String(onTime)} />
            <Tile label="Telat" value={String(late)} />
          </div>
          <div className="mb-3 text-[13px] font-extrabold text-ink">Bulan ini</div>
          <div className="flex flex-col gap-2">
            {log.map((r, i) => {
              const chip = statusChip(r);
              return (
                <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] p-[14px]">
                  <span className="w-9 h-9 rounded-[10px] bg-tint text-primary flex items-center justify-center shrink-0">
                    {Ic.clock}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink">{r.d}</div>
                    <div className="text-[11.5px] text-muted tabular-nums">{r.in} – {r.out}</div>
                  </div>
                  <span
                    className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap"
                    style={{ background: chip.bg, color: chip.color }}
                  >
                    {chip.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
      <TabBar />
    </div>
  );
}
