import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sk } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pager } from "@/components/ui/pagination";
import { usePaged } from "@/lib/use-paged";
import { TabBar } from "@/components/tab-bar";
import { Ic, RIc } from "@/components/icons";
import { useApp, dateStr, fmtTime } from "@/app/store";
import { api, type ApiLogEntry } from "@/lib/api";

type Status = "ontime" | "late" | "early" | "noout" | "absent" | "timeoff" | "holiday" | "dayoff";

const META: Record<Status, { label: string; bg: string; color: string }> = {
  ontime: { label: "Tepat", bg: "var(--tint2)", color: "var(--primary)" },
  late: { label: "Telat", bg: "var(--danger-soft)", color: "var(--danger)" },
  early: { label: "Pulang Cepat", bg: "var(--warn-soft)", color: "var(--warn)" },
  noout: { label: "Tidak Clock Out", bg: "var(--warn-soft)", color: "var(--warn)" },
  absent: { label: "Alpa", bg: "var(--danger-soft)", color: "var(--danger)" },
  timeoff: { label: "Izin / Cuti", bg: "var(--tint)", color: "var(--muted)" },
  holiday: { label: "Libur Nasional", bg: "var(--danger-soft)", color: "var(--danger)" },
  dayoff: { label: "Libur", bg: "var(--tint)", color: "var(--muted)" },
};

interface DayEntry {
  date: string;
  status: Status;
  label: string;
  time: string;
}

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const pad2 = (n: number) => String(n).padStart(2, "0");
const isRestDay = (date: string) => new Date(date + "T12:00:00Z").getUTCDay() === 1; // Senin
const dayLabel = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" });

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
        {[0, 1, 2, 3].map((i) => (
          <Sk key={i} w="100%" h={64} r={16} style={{ flex: 1 }} />
        ))}
      </div>
      <Sk w={110} h={13} style={{ marginBottom: 12 }} />
      <Sk w="100%" h={220} r={14} />
    </>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 bg-card border border-line rounded-[16px] px-2 py-[12px] text-center">
      <div className="text-[19px] font-extrabold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[10.5px] text-muted font-semibold mt-[2px]">{label}</div>
    </div>
  );
}

const monthCache = new Map<string, ApiLogEntry[]>();

export function HistoryScreen() {
  const { requests } = useApp();
  const today = dateStr();
  const currentMonth = ym(new Date());
  const [month, setMonth] = React.useState(currentMonth);
  const [data, setData] = React.useState<{ month: string; rows: ApiLogEntry[] } | null>(null);
  const [holidays, setHolidays] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let alive = true;
    const cached = month < currentMonth ? monthCache.get(month) : undefined;
    (cached ? Promise.resolve(cached) : api.attendanceLog(month))
      .then((rows) => {
        if (!cached && month < currentMonth) monthCache.set(month, rows);
        if (alive) setData({ month, rows });
      })
      .catch(() => alive && setData({ month, rows: [] }));
    return () => {
      alive = false;
    };
  }, [month, currentMonth]);

  const year = month.slice(0, 4);
  React.useEffect(() => {
    let alive = true;
    api
      .holidays(Number(year))
      .then((r) => alive && setHolidays(Object.fromEntries(r.holidays.map((h) => [h.date, h.name]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [year]);

  const loading = data?.month !== month;
  const rows = React.useMemo(() => (data?.month === month ? data.rows : []), [data, month]);

  // Classify every elapsed day of the month into one status.
  const entries = React.useMemo<DayEntry[]>(() => {
    const byDate = new Map<string, ApiLogEntry[]>();
    for (const r of rows) {
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    }
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y!, m!, 0).getDate();
    const out: DayEntry[] = [];
    for (let d = daysInMonth; d >= 1; d--) {
      const date = `${month}-${pad2(d)}`;
      if (date > today) continue; // future days
      const sessions = (byDate.get(date) ?? []).sort((a, b) => a.shift - b.shift);
      let status: Status;
      let time = "–";
      if (sessions.length > 0) {
        const first = sessions[0]!;
        const last = sessions[sessions.length - 1]!;
        time = `${fmtTime(new Date(first.checkIn))} – ${last.checkOut ? fmtTime(new Date(last.checkOut)) : "—"}`;
        status = sessions.some((s) => s.late)
          ? "late"
          : sessions.some((s) => !s.checkOut) && date < today
            ? "noout"
            : sessions.some((s) => s.earlyOut)
              ? "early"
              : "ontime";
      } else if (holidays[date]) {
        status = "holiday";
      } else if (isRestDay(date)) {
        status = "dayoff";
      } else if (
        requests.some(
          (req) => req.status !== "Ditolak" && req.startDate && date >= req.startDate && date <= (req.endDate ?? req.startDate),
        )
      ) {
        status = "timeoff";
      } else if (date < today) {
        status = "absent";
      } else {
        continue; // today, workday, not yet clocked — no record
      }
      out.push({ date, status, label: dayLabel(date), time });
    }
    return out;
  }, [rows, requests, holidays, month, today]);

  const counts = React.useMemo(() => {
    const c = { ontime: 0, late: 0, absent: 0, libur: 0 };
    for (const e of entries) {
      if (e.status === "ontime" || e.status === "early") c.ontime++;
      else if (e.status === "late") c.late++;
      else if (e.status === "absent") c.absent++;
      else if (e.status === "holiday" || e.status === "dayoff") c.libur++;
    }
    return c;
  }, [entries]);

  // Re-slice the pager against the current entries.
  const view = usePaged(entries, 10);

  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-safe-58 pb-[100px]">
      <h1 className="text-[24px] font-extrabold text-ink mb-[14px] tracking-[-0.4px]">Riwayat</h1>

      {/* month stepper */}
      <div className="flex items-center gap-2 mb-[18px]">
        <Button
          variant="back"
          aria-label="Bulan sebelumnya"
          onClick={() => {
            setMonth(shiftMonth(month, -1));
            view.setPage(0);
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
            view.setPage(0);
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
            <Tile label="Tepat" value={counts.ontime} color="var(--primary)" />
            <Tile label="Telat" value={counts.late} color="var(--danger)" />
            <Tile label="Alpa" value={counts.absent} color="var(--danger)" />
            <Tile label="Libur" value={counts.libur} color="var(--muted)" />
          </div>
          <div className="mb-3 text-[13px] font-extrabold text-ink">Sesi presensi</div>
          {entries.length === 0 ? (
            <div className="text-center text-[13px] text-muted font-semibold bg-tint rounded-[14px] px-4 py-5">
              Tidak ada catatan pada {monthLabel(month)}.
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
                  {view.pageItems.map((e) => {
                    const meta = META[e.status];
                    return (
                      <TableRow key={e.date}>
                        <TableCell className="font-bold whitespace-nowrap">{e.label}</TableCell>
                        <TableCell className="text-muted tabular-nums whitespace-nowrap">{e.time}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pager
                page={view.page}
                pageCount={view.pageCount}
                rangeStart={view.rangeStart}
                rangeEnd={view.rangeEnd}
                total={view.total}
                onPage={view.setPage}
              />
            </>
          )}
        </>
      )}
      <TabBar />
    </div>
  );
}
