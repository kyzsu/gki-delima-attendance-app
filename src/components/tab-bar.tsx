import { NavLink } from "react-router-dom";
import { TabIcon } from "@/components/icons";

const TABS = [
  { id: "beranda", label: "Beranda", to: "/home" },
  { id: "pengajuan", label: "Pengajuan", to: "/requests" },
  { id: "riwayat", label: "Riwayat", to: "/history" },
  { id: "profil", label: "Profil", to: "/profile" },
];

export function TabBar() {
  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[430px] flex border-t border-line z-40 px-2 pt-[9px] pb-safe-nav"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {TABS.map((t) => (
        <NavLink
          key={t.id}
          to={t.to}
          className="flex-1 flex flex-col items-center gap-1 py-1 relative no-underline"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className="absolute -top-[9px] w-[30px] h-[3px] rounded-full"
                  style={{ background: "var(--grad)" }}
                />
              )}
              <span className="flex" style={{ color: isActive ? "var(--primary)" : "var(--muted)" }}>
                {TabIcon[t.id]}
              </span>
              <span
                className="text-[10.5px] font-bold"
                style={{ color: isActive ? "var(--primary)" : "var(--muted)" }}
              >
                {t.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
