import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Seg } from "@/components/ui/segmented";
import { Note } from "@/components/ui/note";
import { Sk } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Ic, RIc } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useApp, fmtTime, fmtDateLong, greeting } from "@/app/store";
import { statusChip } from "@/screens/attendance/home";
import { RequestSheet } from "./request-sheet";
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
function AuthImg({ src, alt, className = "w-12 h-12" }: { src: string; alt: string; className?: string }) {
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
  if (!url) return <div className={cn("rounded-[10px] bg-tint shrink-0", className)} />;
  return <img src={url} alt={alt} className={cn("rounded-[10px] object-cover shrink-0", className)} />;
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
    <div className="flex flex-col items-center gap-[10px] bg-tint rounded-[16px] px-5 py-6 text-center">
      <span className="w-10 h-10 rounded-full bg-tint2 text-primary flex items-center justify-center">
        {Ic.check}
      </span>
      <span className="text-[13px] text-muted font-semibold leading-[1.5]">{children}</span>
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

function PhotoBlank() {
  return (
    <div className="w-8 h-8 rounded-[8px] bg-tint flex items-center justify-center text-muted shrink-0">
      <span className="scale-75 flex">{Ic.camera}</span>
    </div>
  );
}

const requestColumns: ColumnDef<AdminRequest>[] = [
  {
    id: "title",
    accessorKey: "title",
    header: "Pengajuan",
    meta: { label: "Pengajuan", cellClassName: "font-bold" },
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="flex items-center gap-2">
          <span className="text-muted flex shrink-0">{KIND_ICON[r.kind]}</span>
          <span className="truncate max-w-[104px]">{r.title}</span>
        </div>
      );
    },
  },
  {
    id: "userName",
    accessorKey: "userName",
    header: "Karyawan",
    meta: { label: "Karyawan" },
    cell: ({ row }) => (
      <>
        <span className="block truncate max-w-[120px] text-[12px] font-semibold text-ink">{row.original.userName}</span>
        <span className="block truncate max-w-[120px] text-[11px] text-muted">{row.original.detail}</span>
      </>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    enableSorting: false,
    enableHiding: false,
    meta: { align: "right" },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <StatusChip status={row.original.status} />
        <span className="text-line2 flex shrink-0">{RIc.chevR}</span>
      </div>
    ),
  },
];

/** Admin requests as a paginated table; rows open the decision sheet. */
function RequestsTable({ rows, onOpen }: { rows: AdminRequest[]; onOpen: (r: AdminRequest) => void }) {
  return <DataTable columns={requestColumns} data={rows} onRowClick={onOpen} getRowId={(r) => String(r.id)} />;
}

const STATUS_RANK = (s: AdminSession) => (s.late ? 3 : s.earlyOut ? 2 : s.special ? 0 : 1);

const sessionColumns: ColumnDef<AdminSession>[] = [
  {
    id: "userName",
    accessorKey: "userName",
    header: "Karyawan",
    meta: { label: "Karyawan", cellClassName: "font-bold" },
    enableHiding: false,
    cell: ({ row }) => {
      const s = row.original;
      return (
        <>
          <span className="block truncate max-w-[84px]">{s.userName}</span>
          {s.shift > 0 && <span className="block text-[10.5px] text-muted font-semibold">Sesi 2</span>}
          {s.distanceM !== null && (
            <span className="block text-[10.5px] text-muted tabular-nums">±{s.distanceM} m</span>
          )}
        </>
      );
    },
  },
  {
    id: "checkIn",
    accessorKey: "checkIn",
    header: "Masuk",
    meta: { label: "Masuk" },
    cell: ({ row }) => {
      const s = row.original;
      return (
        <div className="flex items-center gap-[6px]">
          {s.photoIn ? (
            <AuthImg src={photoUrl(s.id, "in")} alt={`Masuk ${s.userName}`} className="w-8 h-8" />
          ) : (
            <PhotoBlank />
          )}
          <span className="text-[11px] tabular-nums text-ink">
            {fmtTime(new Date(s.checkIn))}
            {s.late && <span className="block" style={{ color: "var(--danger)" }}>Telat</span>}
          </span>
        </div>
      );
    },
  },
  {
    id: "checkOut",
    accessorFn: (s) => s.checkOut ?? "",
    header: "Pulang",
    meta: { label: "Pulang" },
    cell: ({ row }) => {
      const s = row.original;
      if (!s.checkOut) return <span className="text-[11px] text-muted">Belum pulang</span>;
      return (
        <div className="flex items-center gap-[6px]">
          {s.photoOut ? (
            <AuthImg src={photoUrl(s.id, "out")} alt={`Pulang ${s.userName}`} className="w-8 h-8" />
          ) : (
            <PhotoBlank />
          )}
          <span className="text-[11px] tabular-nums text-ink">
            {fmtTime(new Date(s.checkOut))}
            {s.earlyOut && <span className="block" style={{ color: "var(--warn)" }}>Cepat</span>}
          </span>
        </div>
      );
    },
  },
  {
    id: "break",
    accessorFn: (s) => s.breakStart ?? "",
    header: "Istirahat",
    enableSorting: false,
    meta: { label: "Istirahat" },
    cell: ({ row }) => {
      const s = row.original;
      if (s.breakStart && s.breakEnd) {
        return (
          <span className="text-[11px] tabular-nums text-ink">
            {fmtTime(new Date(s.breakStart))}–{fmtTime(new Date(s.breakEnd))}
          </span>
        );
      }
      if (s.breakStart) {
        return (
          <span className="text-[11px] font-semibold" style={{ color: "var(--warn)" }}>
            Sejak {fmtTime(new Date(s.breakStart))}
          </span>
        );
      }
      return <span className="text-[11px] text-muted">—</span>;
    },
  },
  {
    id: "status",
    accessorFn: STATUS_RANK,
    header: "Status",
    enableHiding: false,
    meta: { align: "right" },
    cell: ({ row }) => {
      const chip = statusChip(row.original);
      return (
        <span
          className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap"
          style={{ background: chip.bg, color: chip.color }}
        >
          {chip.label}
        </span>
      );
    },
  },
];

/** Today's attendance sessions as a paginated table, selfie thumbnails inline.
 *  Istirahat is hidden by default (toggleable) — Karyawan/Masuk/Pulang/Status
 *  already fill a 430px screen on their own. */
function SessionsTable({ sessions }: { sessions: AdminSession[] }) {
  return (
    <DataTable
      columns={sessionColumns}
      data={sessions}
      initialVisibility={{ break: false }}
      getRowId={(s) => String(s.id)}
    />
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
  const [tempPw, setTempPw] = React.useState<{ name: string; pw: string } | null>(null);
  const [sheetReq, setSheetReq] = React.useState<AdminRequest | null>(null);

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

  async function decide(action: () => Promise<unknown>, key: string): Promise<boolean> {
    setBusyId(key);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function decideRequest(decision: "Disetujui" | "Ditolak", reason?: string) {
    if (!sheetReq) return;
    const ok = await decide(
      () => api.adminDecideRequest(sheetReq.id, decision, reason),
      `r${sheetReq.id}`,
    );
    if (ok) setSheetReq(null);
  }

  async function resetPassword(u: ApiUser) {
    setBusyId(`rp${u.id}`);
    setError(null);
    try {
      const res = await api.adminResetPassword(u.id);
      setTempPw({ name: u.name, pw: res.tempPassword });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setBusyId(null);
    }
  }

  const pendingUsers = users?.filter((u) => u.status === "pending") ?? [];
  const resetUsers = users?.filter((u) => u.resetRequested) ?? [];
  const decidedUsers = users?.filter((u) => u.status !== "pending" && u.role !== "admin") ?? [];
  const pendingReqs = requests?.filter((r) => r.status === "Menunggu") ?? [];
  const decidedReqs = requests?.filter((r) => r.status !== "Menunggu") ?? [];

  return (
    <div className="screen bg-bg">
      {/* Pinned header: identity, hero, and tabs stay put while only the tab
          content below scrolls. */}
      <div className="px-6 pt-safe-60 shrink-0">
        {/* The admin's homepage — identity header with logout, no employee nav. */}
      <div className="flex items-center gap-3 mb-[22px]">
        <div
          className="w-[46px] h-[46px] rounded-full text-white flex items-center justify-center font-extrabold text-[17px] shrink-0"
          style={{ background: "var(--grad)" }}
        >
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-muted font-semibold">{greeting()}</div>
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

      {/* warm hero, matching the employee homepage */}
      <div
        className="rounded-[24px] text-white relative overflow-hidden mb-[18px]"
        style={{ background: "var(--grad-hero)", boxShadow: "0 14px 30px var(--glow)", padding: "20px 22px 22px" }}
      >
        <div className="absolute rounded-full" style={{ top: -40, right: -30, width: 130, height: 130, background: "rgba(255,255,255,0.12)" }} />
        <div className="relative">
          <div className="text-[13px] font-semibold opacity-90">{fmtDateLong(new Date())}</div>
          <div className="text-[24px] font-extrabold tracking-[-0.5px] mt-[2px]">Panel Admin</div>
          <div className="text-[13px] opacity-90 mt-1 leading-[1.5]">
            Persetujuan, presensi, dan kabar tim — semua di satu tempat. Selamat melayani 🙏
          </div>
        </div>
      </div>

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
      </div>

      <div className="screen-scroll px-6 pb-10">
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
            {tempPw && (
              <Note tone="ok" icon={Ic.check}>
                Sandi sementara untuk <b>{tempPw.name}</b>: <b style={{ fontFamily: "monospace" }}>{tempPw.pw}</b>
                {" "}— sampaikan langsung ke yang bersangkutan. Mereka akan diminta membuat sandi baru saat masuk.
              </Note>
            )}
            {resetUsers.map((u) => (
              <div key={`reset-${u.id}`} className="bg-card rounded-[16px] px-[15px] py-[13px]" style={{ border: "1.5px solid var(--primary)" }}>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[10px] bg-tint2 text-primary flex items-center justify-center shrink-0">
                    {Ic.lock}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-extrabold text-ink truncate">{u.name}</div>
                    <div className="text-[11.5px] text-muted truncate">Lupa kata sandi — minta dibuatkan yang baru</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === `rp${u.id}`}
                  onClick={() => resetPassword(u)}
                  className="w-full mt-3 py-[9px] rounded-[11px] border-none text-white text-[12.5px] font-extrabold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "var(--grad)" }}
                >
                  {busyId === `rp${u.id}` ? "Membuat…" : "Buatkan Sandi Sementara"}
                </button>
              </div>
            ))}
            {pendingUsers.length === 0 && (
              <EmptyNote>Semua beres — tidak ada pendaftaran yang menunggu persetujuan.</EmptyNote>
            )}
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
            {sessions.length === 0 ? (
              <EmptyNote>Belum ada presensi hari ini — daftar akan terisi begitu tim mulai check-in.</EmptyNote>
            ) : (
              <SessionsTable sessions={sessions} />
            )}
          </div>
        )
      ) : tab === "absences" ? (
        absences === null ? (
          <ListSkeleton />
        ) : (
          <div className="flex flex-col gap-2">
            <Note tone="warn" icon={Ic.calendar}>
              Hari kerja bulan ini tanpa presensi maupun cuti/dinas disetujui. Ada baiknya menyapa
              karyawannya dulu — daftar ini memengaruhi tunjangan kehadiran (Pasal 5 ayat 8).
            </Note>
            {absences.length === 0 && (
              <EmptyNote>Bulan ini bersih — semua hari kerja tercatat hadir atau berizin. 🎉</EmptyNote>
            )}
            {absences.map((a, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-line rounded-[14px] px-[13px] py-[11px]">
                <span className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                  {Ic.calendar}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-ink truncate">{a.userName}</div>
                  <div className="text-[11.5px] text-muted truncate">{a.date} · {a.position}</div>
                </div>
                <span className="text-[10.5px] font-extrabold px-[10px] py-1 rounded-full whitespace-nowrap" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                  Perlu Dicek
                </span>
              </div>
            ))}
          </div>
        )
      ) : requests === null ? (
        <ListSkeleton />
      ) : (
        <div className="flex flex-col gap-2">
          {pendingReqs.length === 0 && (
            <EmptyNote>Semua pengajuan sudah ditindaklanjuti — tidak ada yang menunggu.</EmptyNote>
          )}
          {pendingReqs.length > 0 && (
            <>
              <div className="text-[11px] text-muted px-1 mb-1">
                Ketuk pengajuan untuk melihat detail lengkap sebelum menyetujui / menolak.
              </div>
              <RequestsTable rows={pendingReqs} onOpen={setSheetReq} />
            </>
          )}

          {decidedReqs.length > 0 && (
            <>
              <div className="mt-4 mb-1 text-[13px] font-extrabold text-ink">Riwayat keputusan</div>
              <RequestsTable rows={decidedReqs} onOpen={setSheetReq} />
            </>
          )}
        </div>
      )}
      </div>

      {sheetReq && (
        <RequestSheet
          req={sheetReq}
          busy={busyId === `r${sheetReq.id}`}
          onClose={() => setSheetReq(null)}
          onDecide={decideRequest}
        />
      )}
    </div>
  );
}
