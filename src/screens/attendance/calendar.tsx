import * as React from "react";
import { ScreenHead } from "@/components/screen-head";
import { Sk } from "@/components/ui/skeleton";
import { useApp, dateStr, fmtDateLong } from "@/app/store";
import { api, type ApiLogEntry, type ApiRequest } from "@/lib/api";
import { holidayOn } from "@/lib/holidays";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const KIND_LABEL: Record<ApiRequest["kind"], string> = { cuti: "Cuti", dinas: "Dinas", lembur: "Lembur" };
const KIND_COLOR: Record<ApiRequest["kind"], string> = {
  cuti: "var(--primary)",
  dinas: "#2C8C6B",
  lembur: "var(--warn)",
};
const ATT_OK = "#2C8C6B";
const HOLIDAY = "var(--danger)";

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayStr = (month: string, n: number) => `${month}-${String(n).padStart(2, "0")}`;

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return ym(new Date(y!, m! - 1 + delta, 1));
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function addDay(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const weekdayOf = (date: string) => new Date(date + "T12:00:00Z").getUTCDay();
const isRestDay = (date: string) => weekdayOf(date) === 1; // Senin libur

interface DayMarks {
  attendance?: "ok" | "late";
  kinds: Set<ApiRequest["kind"]>;
  holiday: string | null;
  rest: boolean;
}

function Dot({ color }: { color: string }) {
  return <span className="w-[5px] h-[5px] rounded-full" style={{ background: color }} />;
}

export function CalendarScreen() {
  const { requests } = useApp();
  const today = dateStr();
  const [month, setMonth] = React.useState(ym(new Date()));
  const [data, setData] = React.useState<{ month: string; rows: ApiLogEntry[] } | null>(null);
  const [sel, setSel] = React.useState(today);

  React.useEffect(() => {
    let alive = true;
    api
      .attendanceLog(month)
      .then((rows) => alive && setData({ month, rows }))
      .catch(() => alive && setData({ month, rows: [] }));
    return () => {
      alive = false;
    };
  }, [month]);

  const loading = data?.month !== month;
  const rows = React.useMemo(() => (data?.month === month ? data.rows : []), [data, month]);

  // Build per-day marker map for the visible month.
  const marks = React.useMemo(() => {
    const map = new Map<string, DayMarks>();
    const get = (d: string): DayMarks => {
      let m = map.get(d);
      if (!m) {
        m = { kinds: new Set(), holiday: holidayOn(d), rest: isRestDay(d) };
        map.set(d, m);
      }
      return m;
    };
    for (const r of rows) {
      const m = get(r.date);
      m.attendance = r.late ? "late" : m.attendance ?? "ok";
    }
    for (const req of requests) {
      if (req.status === "Ditolak" || !req.startDate) continue;
      const end = req.endDate ?? req.startDate;
      for (let d = req.startDate; d <= end; d = addDay(d, 1)) {
        if (d.slice(0, 7) === month) get(d).kinds.add(req.kind);
        if (d > end) break;
      }
    }
    return map;
  }, [rows, requests, month]);

  const [y, m] = month.split("-").map(Number);
  const startPad = new Date(y!, m! - 1, 1).getDay();
  const daysInMonth = new Date(y!, m!, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selMarks = marks.get(sel);

  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-safe-58 pb-10">
      <ScreenHead title="Kalender" sub="Presensi, pengajuan & hari libur." close to="/home" />

      {/* month stepper */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          onClick={() => setMonth((mo) => shiftMonth(mo, -1))}
          className="w-9 h-9 rounded-[11px] bg-card border border-line flex items-center justify-center text-muted cursor-pointer"
        >
          ‹
        </button>
        <div className="flex-1 text-center text-[15px] font-extrabold text-ink">{monthLabel(month)}</div>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          onClick={() => setMonth((mo) => shiftMonth(mo, 1))}
          className="w-9 h-9 rounded-[11px] bg-card border border-line flex items-center justify-center text-muted cursor-pointer"
        >
          ›
        </button>
      </div>

      {/* calendar grid */}
      <div className="bg-card border border-line rounded-[18px] p-3">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className="text-center text-[11px] font-bold"
              style={{ color: i === 0 ? "var(--danger)" : "var(--muted)" }}
            >
              {w}
            </div>
          ))}
        </div>
        {loading ? (
          <Sk w="100%" h={222} r={12} />
        ) : (
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((n, i) => {
              if (n === null) return <div key={i} />;
              const d = dayStr(month, n);
              const mk = marks.get(d);
              const isToday = d === today;
              const isSel = d === sel;
              const sunday = i % 7 === 0;
              const holiday = mk?.holiday;
              const dots: string[] = [];
              if (mk?.attendance) dots.push(mk.attendance === "late" ? "var(--danger)" : ATT_OK);
              for (const k of mk?.kinds ?? []) dots.push(KIND_COLOR[k]);
              if (holiday) dots.push(HOLIDAY);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSel(d)}
                  className="flex flex-col items-center gap-[3px] py-[5px] rounded-[10px] cursor-pointer bg-transparent border-none"
                  style={isSel ? { background: "var(--tint2)" } : undefined}
                >
                  <span
                    className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold tabular-nums"
                    style={
                      isToday
                        ? { background: "var(--grad)", color: "#fff" }
                        : { color: holiday || sunday ? "var(--danger)" : "var(--text)" }
                    }
                  >
                    {n}
                  </span>
                  <span className="flex gap-[3px] h-[5px] items-center">
                    {dots.slice(0, 4).map((c, j) => (
                      <Dot key={j} color={c} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* selected-day detail */}
      <div className="mt-4 mb-[10px] text-[13px] font-extrabold text-ink">
        {sel === today ? "Hari ini" : fmtDateLong(new Date(sel + "T00:00:00"))}
      </div>
      <div className="flex flex-col gap-2">
        {selMarks?.holiday && (
          <EventRow color={HOLIDAY} label="Libur nasional" value={selMarks.holiday} />
        )}
        {selMarks?.rest && !selMarks.holiday && (
          <EventRow color="var(--muted)" label="Hari libur" value="Senin — tidak ada shift" />
        )}
        {rows
          .filter((r) => r.date === sel)
          .map((r, i) => (
            <EventRow
              key={`att${i}`}
              color={r.late ? "var(--danger)" : ATT_OK}
              label={r.late ? "Presensi · Telat" : "Presensi · Tepat"}
              value={`${hm(r.checkIn)} – ${r.checkOut ? hm(r.checkOut) : "—"}`}
            />
          ))}
        {requests
          .filter(
            (req) =>
              req.status !== "Ditolak" &&
              req.startDate &&
              sel >= req.startDate &&
              sel <= (req.endDate ?? req.startDate),
          )
          .map((req) => (
            <EventRow key={`req${req.id}`} color={KIND_COLOR[req.kind]} label={KIND_LABEL[req.kind]} value={`${req.title} · ${req.status}`} />
          ))}
        {!selMarks?.holiday &&
          !selMarks?.rest &&
          rows.filter((r) => r.date === sel).length === 0 &&
          requests.filter((req) => req.status !== "Ditolak" && req.startDate && sel >= req.startDate && sel <= (req.endDate ?? req.startDate)).length === 0 && (
            <div className="text-center text-[12.5px] text-muted font-semibold bg-tint rounded-[14px] px-4 py-4">
              Tidak ada catatan pada tanggal ini.
            </div>
          )}
      </div>
    </div>
  );
}

const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");

function EventRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[14px] py-[11px]">
      <span className="w-[10px] h-[10px] rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-ink">{label}</div>
        <div className="text-[11.5px] text-muted truncate">{value}</div>
      </div>
    </div>
  );
}
