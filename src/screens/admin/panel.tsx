import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Seg } from "@/components/ui/segmented";
import { Note } from "@/components/ui/note";
import { Sk } from "@/components/ui/skeleton";
import { Ic, RIc } from "@/components/icons";
import { useApp, fmtTime } from "@/app/store";
import { statusChip } from "@/screens/attendance/home";
import {
  api,
  getToken,
  photoUrl,
  type AdminRequest,
  type AdminSession,
  type ApiAbsence,
  type ApiUser,
  type Position,
} from "@/lib/api";

type Tab = "users" | "requests" | "absences" | "attendance";

/** The selfie endpoint needs the Authorization header, which <img> can't
 *  send — fetch as a blob and display via an object URL. */
function AuthImg({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    let obj: string | null = null;
    fetch(src, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b && alive) {
          obj = URL.createObjectURL(b);
          setUrl(obj);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [src]);
  if (!url) return <div className="w-12 h-12 rounded-[10px] bg-tint shrink-0" />;
  return <img src={url} alt={alt} className="w-12 h-12 rounded-[10px] object-cover shrink-0" />;
}

const POSITIONS: { v: Position; label: string }[] = [
  { v: "tata_usaha", label: "Tata Usaha" },
  { v: "sopir", label: "Sopir" },
  { v: "koster", label: "Koster" },
];

const KIND_ICON = { cuti: RIc.calX, dinas: RIc.plane, lembur: RIc.hourglass } as const;

function StatusChip({ status }: { status: string }) {
  const ok = status === "Disetujui" || status === "approved";
  const rejected = status === "Ditolak" || status === "rejected";
  return (
    <span
      className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap"
      style={{
        background: ok ? "var(--tint2)" : rejected ? "var(--danger-soft)" : "var(--warn-soft)",
        color: ok ? "var(--primary)" : rejected ? "var(--danger)" : "var(--warn)",
      }}
    >
      {ok ? "Disetujui" : rejected ? "Ditolak" : "Menunggu"}
    </span>
  );
}

function DecideButtons({
  busy,
  onApprove,
  onReject,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex gap-2 mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={onApprove}
        className="flex-1 py-[9px] rounded-[11px] border-none text-white text-[12.5px] font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: "var(--grad)" }}
      >
        Setujui
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onReject}
        className="flex-1 py-[9px] rounded-[11px] bg-transparent text-[12.5px] font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        style={{ border: "1.5px solid var(--line2)", color: "var(--danger)" }}
      >
        Tolak
      </button>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-[13px] text-muted font-semibold bg-tint rounded-[14px] px-4 py-5">
      {children}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-card border border-line rounded-[14px] p-[14px] flex items-center gap-3">
          <Sk w={36} h={36} r={10} />
          <div className="flex-1 flex flex-col gap-[7px]">
            <Sk w={140} h={13} />
            <Sk w={90} h={10} />
          </div>
          <Sk w={56} h={20} r={99} />
        </div>
      ))}
    </div>
  );
}

export function AdminPanelScreen() {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [tab, setTab] = React.useState<Tab>("users");
  const [users, setUsers] = React.useState<ApiUser[] | null>(null);
  const [requests, setRequests] = React.useState<AdminRequest[] | null>(null);
  const [absences, setAbsences] = React.useState<ApiAbsence[] | null>(null);
  const [sessions, setSessions] = React.useState<AdminSession[] | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [u, r, a, att] = await Promise.all([
        api.adminUsers(),
        api.adminRequests(),
        api.adminAbsences(),
        api.adminAttendance(),
      ]);
      setUsers(u);
      setRequests(r);
      setAbsences(a.absences);
      setSessions(att.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
    }
  }, []);

  React.useEffect(() => {
    // False positive: every setState in load happens after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function decide(action: () => Promise<unknown>, key: string) {
    setBusyId(key);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setBusyId(null);
    }
  }

  const pendingUsers = users?.filter((u) => u.status === "pending") ?? [];
  const decidedUsers = users?.filter((u) => u.status !== "pending" && u.role !== "admin") ?? [];
  const pendingReqs = requests?.filter((r) => r.status === "Menunggu") ?? [];
  const decidedReqs = requests?.filter((r) => r.status !== "Menunggu") ?? [];

  return (
    <div className="flex flex-col flex-1 bg-bg px-6 pt-[60px] pb-10">
      {/* The admin's homepage — identity header with logout, no employee nav. */}
      <div className="flex items-center gap-3 mb-[22px]">
        <div
          className="w-[46px] h-[46px] rounded-full text-white flex items-center justify-center font-extrabold text-[17px] shrink-0"
          style={{ background: "var(--grad)" }}
        >
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-muted font-semibold">Koordinator Personalia</div>
          <div className="text-[16.5px] font-extrabold text-ink tracking-[-0.2px] truncate">{user.name}</div>
        </div>
        <Button
          variant="back"
          aria-label="Keluar"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          {Ic.logout}
        </Button>
      </div>
      <h1 className="text-[24px] font-extrabold text-ink tracking-[-0.4px] mb-[2px]">Panel Admin</h1>
      <p className="text-[13.5px] text-muted mb-[18px] leading-[1.45]">
        Persetujuan pendaftaran & pengajuan karyawan.
      </p>

      <div className="mb-4">
        <Seg
          value={tab}
          onChange={setTab}
          options={[
            { v: "users", label: `Akun (${pendingUsers.length})` },
            { v: "requests", label: `Ajuan (${pendingReqs.length})` },
            { v: "absences", label: `Absen (${absences?.length ?? 0})` },
            { v: "attendance", label: `Presensi (${sessions?.length ?? 0})` },
          ]}
        />
      </div>

      {error && (
        <div className="mb-3">
          <Note tone="danger" icon={Ic.alert}>{error}</Note>
        </div>
      )}

      {tab === "users" ? (
        users === null ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col gap-2">
            {pendingUsers.length === 0 && <EmptyNote>Tidak ada pendaftaran menunggu.</EmptyNote>}
            {pendingUsers.map((u) => (
              <div key={u.id} className="bg-card border border-line rounded-[16px] px-[15px] py-[13px]">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full text-white flex items-center justify-center font-extrabold text-[14px] shrink-0" style={{ background: "var(--grad)" }}>
                    {u.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-extrabold text-ink truncate">{u.name}</div>
                    <div className="text-[11.5px] text-muted truncate">{u.nip} · {u.email}</div>
                  </div>
                  <StatusChip status={u.status} />
                </div>
                <DecideButtons
                  busy={busyId === `u${u.id}`}
                  onApprove={() => decide(() => api.adminDecideUser(u.id, "approved"), `u${u.id}`)}
                  onReject={() => decide(() => api.adminDecideUser(u.id, "rejected"), `u${u.id}`)}
                />
              </div>
            ))}

            {decidedUsers.length > 0 && (
              <>
                <div className="mt-4 mb-1 text-[13px] font-extrabold text-ink">Karyawan terdaftar</div>
                {decidedUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[13px] py-[11px]">
                    <span className="w-[34px] h-[34px] rounded-[10px] bg-tint text-muted flex items-center justify-center shrink-0">
                      {Ic.user}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-ink truncate">{u.name}</div>
                      <div className="text-[11.5px] text-muted truncate">{u.email}</div>
                    </div>
                    {u.status === "approved" ? (
                      <select
                        value={u.position}
                        disabled={busyId === `p${u.id}`}
                        onChange={(e) =>
                          decide(() => api.adminSetPosition(u.id, e.target.value as Position), `p${u.id}`)
                        }
                        aria-label={`Posisi ${u.name}`}
                        className="text-[11px] font-bold text-primary bg-tint border border-line rounded-[9px] px-2 py-[6px] cursor-pointer outline-none"
                      >
                        {POSITIONS.map((p) => (
                          <option key={p.v} value={p.v}>{p.label}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusChip status={u.status} />
                    )}
                  </div>
                ))}
                <div className="text-[11px] text-muted px-1">
                  Posisi menentukan jadwal kerja Pasal 5 (jam masuk, hari libur, sesi Minggu).
                </div>
              </>
            )}
          </div>
        )
      ) : tab === "attendance" ? (
        sessions === null ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col gap-2">
            <Note tone="info" icon={Ic.camera}>
              Presensi hari ini dengan <b>foto selfie</b> dan jarak GPS saat check-in/out.
            </Note>
            {sessions.length === 0 && <EmptyNote>Belum ada presensi hari ini.</EmptyNote>}
            {sessions.map((s) => (
              <div key={s.id} className="bg-card border border-line rounded-[16px] px-[15px] py-[13px]">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-extrabold text-ink truncate">
                      {s.userName}
                      {s.shift > 0 ? " · Sesi 2" : ""}
                    </div>
                    <div className="text-[11.5px] text-muted">
                      {fmtTime(new Date(s.checkIn))} – {s.checkOut ? fmtTime(new Date(s.checkOut)) : "—"}
                      {s.distanceM !== null ? ` · ±${s.distanceM} m` : ""}
                    </div>
                  </div>
                  {(() => {
                    const chip = statusChip(s);
                    return (
                      <span
                        className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap"
                        style={{ background: chip.bg, color: chip.color }}
                      >
                        {chip.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 flex items-center gap-2">
                    {s.photoIn ? (
                      <AuthImg src={photoUrl(s.id, "in")} alt={`Masuk ${s.userName}`} />
                    ) : (
                      <div className="w-12 h-12 rounded-[10px] bg-tint flex items-center justify-center text-muted shrink-0">{Ic.camera}</div>
                    )}
                    <span className="text-[11px] text-muted font-semibold">Masuk{s.late ? " · Telat" : ""}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    {s.photoOut ? (
                      <AuthImg src={photoUrl(s.id, "out")} alt={`Pulang ${s.userName}`} />
                    ) : (
                      <div className="w-12 h-12 rounded-[10px] bg-tint flex items-center justify-center text-muted shrink-0">{Ic.camera}</div>
                    )}
                    <span className="text-[11px] text-muted font-semibold">
                      {s.checkOut ? `Pulang${s.earlyOut ? " · Cepat" : ""}` : "Belum pulang"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "absences" ? (
        absences === null ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col gap-2">
            <Note tone="warn" icon={Ic.alert}>
              Hari kerja terjadwal <b>tanpa presensi dan tanpa cuti/dinas disetujui</b> bulan ini —
              memengaruhi tunjangan kehadiran (Pasal 5 ayat 8).
            </Note>
            {absences.length === 0 && <EmptyNote>Tidak ada absen tanpa keterangan bulan ini.</EmptyNote>}
            {absences.map((a, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[13px] py-[11px]">
                <span className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  {Ic.alert}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-ink truncate">{a.userName}</div>
                  <div className="text-[11.5px] text-muted truncate">{a.date} · {a.position}</div>
                </div>
                <span className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  Tanpa Ket.
                </span>
              </div>
            ))}
          </div>
        )
      ) : requests === null ? (
        <ListSkeleton />
      ) : (
        <div className="flex flex-col gap-2">
          {pendingReqs.length === 0 && <EmptyNote>Tidak ada pengajuan menunggu.</EmptyNote>}
          {pendingReqs.map((r) => (
            <div key={r.id} className="bg-card border border-line rounded-[16px] px-[15px] py-[13px]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-[10px] bg-tint text-primary flex items-center justify-center shrink-0">
                  {KIND_ICON[r.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-extrabold text-ink truncate">{r.title}</div>
                  <div className="text-[11.5px] text-muted truncate">{r.userName} · {r.detail}</div>
                </div>
                <StatusChip status={r.status} />
              </div>
              <DecideButtons
                busy={busyId === `r${r.id}`}
                onApprove={() => decide(() => api.adminDecideRequest(r.id, "Disetujui"), `r${r.id}`)}
                onReject={() => decide(() => api.adminDecideRequest(r.id, "Ditolak"), `r${r.id}`)}
              />
            </div>
          ))}

          {decidedReqs.length > 0 && (
            <>
              <div className="mt-4 mb-1 text-[13px] font-extrabold text-ink">Riwayat keputusan</div>
              {decidedReqs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[13px] py-[11px]">
                  <span className="w-[34px] h-[34px] rounded-[10px] bg-tint text-muted flex items-center justify-center shrink-0">
                    {KIND_ICON[r.kind]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink truncate">{r.title}</div>
                    <div className="text-[11.5px] text-muted truncate">{r.userName} · {r.detail}</div>
                  </div>
                  <StatusChip status={r.status} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
