import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sk } from "@/components/ui/skeleton";
import { TabBar } from "@/components/tab-bar";
import { Ic } from "@/components/icons";
import { useApp, fmtDateLong, fmtTime, fmtDuration, greeting } from "@/app/store";

function useClock(intervalMs = 1000) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function LogList({ items }: { items: { d: string; in: string; out: string; late?: boolean }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((r, i) => (
        <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[14px] py-3">
          <div className="flex-1 text-[13.5px] font-bold text-ink">{r.d}</div>
          <div className="text-[12.5px] text-muted font-semibold tabular-nums">
            {r.in} – {r.out}
          </div>
          <span
            className="text-[11px] font-bold px-[9px] py-[3px] rounded-full"
            style={{
              background: r.late ? "var(--danger-soft)" : "var(--tint2)",
              color: r.late ? "var(--danger)" : "var(--primary)",
            }}
          >
            {r.late ? "Telat" : "Tepat"}
          </span>
        </div>
      ))}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-[60px] pb-10">
      <div className="flex items-center gap-3 mb-[22px]">
        <Sk w={46} h={46} r={99} />
        <div className="flex-1 flex flex-col gap-[7px]">
          <Sk w={80} h={11} />
          <Sk w={150} h={15} />
        </div>
        <Sk w={40} h={40} r={12} />
      </div>
      <Sk w="100%" h={132} r={24} />
      <Sk w="100%" h={54} r={16} style={{ marginTop: 18 }} />
      <Sk w={210} h={12} r={99} style={{ margin: "14px auto 0" }} />
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
  const { user, attendance, checkInAt, log } = useApp();
  const now = useClock();
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <HomeSkeleton />;

  const checkedIn = attendance === "in" && checkInAt;

  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-[60px] pb-[100px]">
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
          <div className="text-[16.5px] font-extrabold text-ink tracking-[-0.2px]">{user.name}</div>
        </div>
        <Button variant="back" aria-label="Kalender">{Ic.calendar}</Button>
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
          </div>
        ) : (
          <div className="relative">
            <div className="text-[13px] font-semibold opacity-90">{fmtDateLong(now)}</div>
            <div className="text-[44px] font-extrabold tracking-[-1px] mt-[2px] mb-1 tabular-nums">{fmtTime(now)}</div>
            <div className="inline-flex items-center gap-[6px] bg-white/[0.18] px-[11px] py-[5px] rounded-full text-[12.5px] font-bold">
              <span className="w-[7px] h-[7px] rounded-full bg-white" />
              {attendance === "done" ? "Presensi hari ini selesai" : "Belum presensi hari ini"}
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
          <div className="flex items-center justify-center gap-[6px] mt-3 text-[12.5px] text-muted font-semibold">
            {Ic.pin}
            <span>Hanya aktif dalam radius 50 m dari gereja</span>
          </div>
        </>
      )}

      {/* recent log */}
      <div className="mt-[26px] mb-[10px] text-[13px] font-extrabold text-ink">Riwayat presensi</div>
      <LogList items={log.slice(0, 3)} />
      <TabBar />
    </div>
  );
}
