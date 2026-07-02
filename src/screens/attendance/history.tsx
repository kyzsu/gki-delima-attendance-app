import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sk } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pager } from "@/components/ui/pagination";
import { usePaged } from "@/lib/use-paged";
import { TabBar } from "@/components/tab-bar";
import { Ic, RIc } from "@/components/icons";
import { toLogEntry } from "@/app/store";
import { api, type ApiLogEntry } from "@/lib/api";
import { statusChip } from "./home";

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return ym(new Date(y!, m! - 1 + delta, 1));
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function HistorySkeleton() {
  return (
    <>
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

// Past months never change — cache them for the session so stepping back
// and forth is instant. The current month always refetches.
const monthCache = new Map<string, ApiLogEntry[]>();

export function HistoryScreen() {
  const currentMonth = ym(new Date());
  const [month, setMonth] = React.useState(currentMonth);
  const [data, setData] = React.useState<{ month: string; rows: ApiLogEntry[] } | null>(null);

  React.useEffect(() => {
    let alive = true;
    const cached = month < currentMonth ? monthCache.get(month) : undefined;
    (cached ? Promise.resolve(cached) : api.attendanceLog(month))
      .then((rows) => {
        if (!cached && month < currentMonth) monthCache.set(month, rows);
        if (alive) setData({ month, rows });
      })
      .catch(() => {
        if (alive) setData({ month, rows: [] });
      });
    return () => {
      alive = false;
    };
  }, [month, currentMonth]);

  const loading = data?.month !== month;
  const rows = data?.rows ?? [];
  const paged = usePaged(rows, 10);
  // One day can hold two sessions (Sunday split shift) — count days attended.
  const daysPresent = new Set(rows.map((r) => r.date)).size;
  const late = rows.filter((r) => r.late).length;
  const onTime = rows.length - late;

  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-safe-58 pb-[100px]">
      <h1 className="text-[24px] font-extrabold text-ink mb-[14px] tracking-[-0.4px]">Riwayat</h1>

      {/* month stepper — browse any past month */}
      <div className="flex items-center gap-2 mb-[18px]">
        <Button
          variant="back"
          aria-label="Bulan sebelumnya"
          onClick={() => {
            setMonth(shiftMonth(month, -1));
            paged.setPage(0);
          }}
        >
          {Ic.chevL}
        </Button>
        <div className="flex-1 text-center text-[15px] font-extrabold text-ink">{monthLabel(month)}</div>
        <Button
          variant="back"
          aria-label="Bulan berikutnya"
          disabled={month >= currentMonth}
          className="disabled:opacity-40"
          onClick={() => {
            setMonth(shiftMonth(month, 1));
            paged.setPage(0);
          }}
        >
          <span className="flex">{RIc.chevR}</span>
        </Button>
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : (
        <>
          <div className="flex gap-[10px] mb-[18px]">
            <Tile label="Hadir" value={String(daysPresent)} />
            <Tile label="Tepat waktu" value={String(onTime)} />
            <Tile label="Telat" value={String(late)} />
          </div>
          <div className="mb-3 text-[13px] font-extrabold text-ink">Sesi presensi</div>
          {rows.length === 0 ? (
            <div className="text-center text-[13px] text-muted font-semibold bg-tint rounded-[14px] px-4 py-5">
              Tidak ada presensi pada {monthLabel(month)}.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.pageItems.map((raw) => {
                    const r = toLogEntry(raw);
                    const chip = statusChip(r);
                    return (
                      <TableRow key={`${raw.date}-${raw.shift}`}>
                        <TableCell className="font-bold whitespace-nowrap">{r.d}</TableCell>
                        <TableCell className="text-muted tabular-nums whitespace-nowrap">{r.in} – {r.out}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap"
                            style={{ background: chip.bg, color: chip.color }}
                          >
                            {chip.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pager
                page={paged.page}
                pageCount={paged.pageCount}
                rangeStart={paged.rangeStart}
                rangeEnd={paged.rangeEnd}
                total={paged.total}
                onPage={paged.setPage}
              />
            </>
          )}
        </>
      )}
      <TabBar />
    </div>
  );
}
