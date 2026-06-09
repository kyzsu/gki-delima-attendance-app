import { useNavigate } from "react-router-dom";
import { TabBar } from "@/components/tab-bar";
import { RIc } from "@/components/icons";
import { useApp } from "@/app/store";

const SERVICES = [
  { to: "/requests/cuti", icon: RIc.calX, title: "Pengajuan Cuti", sub: "Tahunan · Sakit · Darurat · Duka", tone: "var(--primary)" },
  { to: "/requests/dinas", icon: RIc.plane, title: "Perjalanan Dinas", sub: "Klaim tunjangan transport & inap", tone: "#2C8C6B" },
  { to: "/requests/lembur", icon: RIc.hourglass, title: "Pengajuan Lembur", sub: "Maks 3 jam/hari · 14 jam/minggu", tone: "#3B7DD8" },
];

const KIND_ICON = { cuti: RIc.calX, dinas: RIc.plane, lembur: RIc.hourglass } as const;

export function RequestHubScreen() {
  const navigate = useNavigate();
  const { user, requests } = useApp();
  return (
    <div className="flex flex-col flex-1 relative bg-bg px-6 pt-[60px] pb-[100px]">
      <div className="flex items-center gap-3 mb-[22px]">
        <div
          className="w-[46px] h-[46px] rounded-full text-white flex items-center justify-center font-extrabold text-[17px] shrink-0"
          style={{ background: "var(--grad)" }}
        >
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-muted font-semibold">Layanan Karyawan</div>
          <div className="text-[18px] font-extrabold text-ink tracking-[-0.3px]">Pengajuan</div>
        </div>
      </div>

      <div className="flex flex-col gap-[11px]">
        {SERVICES.map((it) => (
          <button
            key={it.to}
            type="button"
            onClick={() => navigate(it.to)}
            className="flex items-center gap-[13px] w-full cursor-pointer bg-card border border-line rounded-[18px] px-[15px] py-[14px] font-sans transition-all hover:border-line2 hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(80,20,80,0.06)]"
          >
            <span className="w-[46px] h-[46px] rounded-[14px] bg-tint flex items-center justify-center shrink-0" style={{ color: it.tone }}>
              <span className="scale-125 flex">{it.icon}</span>
            </span>
            <div className="flex-1 text-left min-w-0">
              <div className="text-[14.5px] font-extrabold text-ink">{it.title}</div>
              <div className="text-[12px] text-muted font-medium mt-px">{it.sub}</div>
            </div>
            <span className="text-line2 flex">{RIc.chevR}</span>
          </button>
        ))}
      </div>

      <div className="mt-[26px] mb-[10px] text-[13px] font-extrabold text-ink">Pengajuan terbaru</div>
      <div className="flex flex-col gap-2">
        {requests.map((r, i) => (
          <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[13px] py-[11px]">
            <span className="w-[34px] h-[34px] rounded-[10px] bg-tint text-muted flex items-center justify-center shrink-0">
              {KIND_ICON[r.kind]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-ink">{r.title}</div>
              <div className="text-[11.5px] text-muted">{r.detail}</div>
            </div>
            <span
              className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full"
              style={{
                background: r.status === "Disetujui" ? "var(--tint2)" : "var(--warn-soft)",
                color: r.status === "Disetujui" ? "var(--primary)" : "var(--warn)",
              }}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
      <TabBar />
    </div>
  );
}
