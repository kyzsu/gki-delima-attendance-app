import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sk } from "@/components/ui/skeleton";
import { TabBar } from "@/components/tab-bar";
import { Ic, RIc } from "@/components/icons";
import { useApp, fmtDateLong, fmtTime, fmtDuration, greeting, type LogEntry } from "@/app/store";

export function statusChip(r: Pick<LogEntry, "late" | "earlyOut" | "special">) {
  if (r.special) return { label: "Khusus", bg: "var(--tint)", color: "var(--muted)" };
  if (r.late) return { label: "Telat", bg: "var(--danger-soft)", color: "var(--danger)" };
  if (r.earlyOut) return { label: "Pulang Cepat", bg: "var(--warn-soft)", color: "var(--warn)" };
  return { label: "Tepat", bg: "var(--tint2)", color: "var(--primary)" };
}

/** "08:30" → "08.30" to match the Indonesian time style used across the app. */
const hm = (t: string) => t.replace(":", ".");
function shiftText(shifts: { start: string; end: string }[]) {
  if (shifts.length === 0) return "Libur hari ini";
  return shifts.map((s) => `${hm(s.start)}–${hm(s.end)}`).join("  ·  ");
}

function useClock(intervalMs = 1000) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** White pill used inside the purple hero card. */
function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[6px] bg-white/[0.18] px-[11px] py-[5px] rounded-full text-[12px] font-bold">
      {children}
    </span>
  );
}

function QuickTile({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-[7px] flex-1 cursor-pointer bg-transparent border-none font-sans p-0"
    >
      <span
        className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center transition-transform active:translate-y-0 hover:-translate-y-px"
        style={{ background: "var(--tint)", color: tone }}
      >
        <span className="scale-110 flex">{icon}</span>
      </span>
      <span className="text-[11.5px] font-bold text-ink">{label}</span>
    </button>
  );
}

function LogList({ items }: { items: LogEntry[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((r, i) => {
        const chip = statusChip(r);
        return (
          <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[14px] py-3">
            <div className="flex-1 text-[13.5px] font-bold text-ink">{r.d}</div>
            <div className="text-[12.5px] text-muted font-semibold tabular-nums">
              {r.in} – {r.out}
            </div>
            <span
              className="text-[11px] font-bold px-[9px] py-[3px] rounded-full whitespace-nowrap"
              style={{ background: chip.bg, color: chip.color }}
            >
              {chip.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-safe-60 pb-10">
      <div className="flex items-center gap-3 mb-[22px]">
        <Sk w={46} h={46} r={99} />
        <div className="flex-1 flex flex-col gap-[7px]">
          <Sk w={80} h={11} />
          <Sk w={150} h={15} />
        </div>
      </div>
      <Sk w="100%" h={150} r={24} />
      <Sk w="100%" h={54} r={16} style={{ marginTop: 18 }} />
      <div className="flex gap-2 mt-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-[7px]">
            <Sk w={52} h={52} r={16} />
            <Sk w={44} h={11} />
          </div>
        ))}
      </div>
      <Sk w={130} h={13} style={{ marginTop: 26, marginBottom: 12 }} />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] p-[14px]">
            <Sk w={90} h={13} style={{ flex: 1 }} />
            <Sk w={70} h={12} />
            <Sk w={42} h={18} r={99} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { ready, user, attendance, checkInAt, todayShifts, log } = useApp();
  const now = useClock();
  const [delayDone, setDelayDone] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setDelayDone(true), 900);
    return () => clearTimeout(t);
  }, []);

  if (!ready || !delayDone) return <HomeSkeleton />;

  const checkedIn = attendance === "in" && checkInAt;
  const restDay = todayShifts.length === 0;
  const schedule = shiftText(todayShifts);

  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-safe-60 pb-[100px]">
      {/* header */}
      <div className="flex items-center gap-3 mb-[22px]">
        <div
          className="w-[46px] h-[46px] rounded-full text-white flex items-center justify-center font-extrabold text-[17px] shrink-0"
          style={{ background: "var(--grad)" }}
        >
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-muted font-semibold">{greeting(now)}</div>
          <div className="text-[16.5px] font-extrabold text-ink tracking-[-0.2px] truncate">{user.name}</div>
        </div>
      </div>

      {/* hero status card */}
      <div
        className="rounded-[24px] text-white relative overflow-hidden"
        style={{ background: "var(--grad-hero)", boxShadow: "0 14px 30px var(--glow)", padding: checkedIn ? "20px 22px 22px" : "22px 22px 24px" }}
      >
        <div className="absolute rounded-full" style={{ top: -40, right: -30, width: 130, height: 130, background: "rgba(255,255,255,0.12)" }} />
        {checkedIn ? (
          <div className="relative">
            <div className="inline-flex items-center gap-[6px] bg-white/20 px-[11px] py-[5px] rounded-full text-[12px] font-bold mb-3">
              <span className="flex">{Ic.check}</span>Sudah presensi masuk
            </div>
            <div className="flex gap-[22px]">
              <div>
                <div className="text-[11.5px] opacity-85 font-semibold">Masuk</div>
                <div className="text-[26px] font-extrabold tracking-[-0.5px] tabular-nums">{fmtTime(checkInAt!)}</div>
              </div>
              <div className="w-px bg-white/25" />
              <div>
                <div className="text-[11.5px] opacity-85 font-semibold">Durasi kerja</div>
                <div className="text-[26px] font-extrabold tracking-[-0.5px] tabular-nums">
                  {fmtDuration(now.getTime() - checkInAt!.getTime())}
                </div>
              </div>
            </div>
            {!restDay && (
              <div className="mt-3 text-[11.5px] opacity-85 font-semibold">Jadwal shift · {schedule}</div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="text-[13px] font-semibold opacity-90">{fmtDateLong(now)}</div>
            <div className="text-[44px] font-extrabold tracking-[-1px] mt-[2px] mb-[10px] tabular-nums">{fmtTime(now)}</div>
            <div className="flex flex-wrap items-center gap-[6px]">
              <HeroPill>
                {restDay ? Ic.check : Ic.clock}
                {restDay ? "Libur hari ini" : `Shift ${schedule}`}
              </HeroPill>
              <HeroPill>
                <span className="w-[7px] h-[7px] rounded-full bg-white" />
                {attendance === "done" ? "Presensi selesai" : "Belum presensi"}
              </HeroPill>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      {attendance !== "done" && (
        <>
          <Button
            variant="primary"
            className="mt-[18px]"
            onClick={() => navigate(checkedIn ? "/checkout/locating" : "/checkin/locating")}
          >
            {checkedIn ? Ic.logout : Ic.login}
            {checkedIn ? "Presensi Pulang" : "Presensi Masuk"}
          </Button>
          <div className="flex items-center justify-center gap-[6px] mt-3 text-[12.5px] text-muted font-semibold text-center">
            {Ic.pin}
            <span>
              {restDay
                ? "Hari libur — presensi dicatat sebagai tugas khusus"
                : "Hanya aktif dalam radius 50 m dari gereja"}
            </span>
          </div>
        </>
      )}

      {/* quick actions */}
      <div className="flex gap-2 mt-5">
        <QuickTile icon={RIc.calX} label="Cuti" tone="var(--primary)" onClick={() => navigate("/requests/leave")} />
        <QuickTile icon={RIc.plane} label="Dinas" tone="#2C8C6B" onClick={() => navigate("/requests/trip")} />
        <QuickTile icon={RIc.hourglass} label="Lembur" tone="#3B7DD8" onClick={() => navigate("/requests/overtime")} />
        <QuickTile icon={Ic.calendar} label="Kalender" tone="#7A3FC0" onClick={() => navigate("/calendar")} />
        <QuickTile icon={Ic.clock} label="Riwayat" tone="var(--primary)" onClick={() => navigate("/history")} />
      </div>

      {/* recent log */}
      <div className="mt-[26px] mb-[10px] text-[13px] font-extrabold text-ink">Riwayat presensi</div>
      <LogList items={log.slice(0, 3)} />
      <TabBar />
    </div>
  );
}
