import * as React from "react";
import { SummaryCard, Row } from "@/components/ui/summary-card";
import { Ic } from "@/components/icons";
import { fmtIDR } from "@/lib/utils";
import type { AdminRequest } from "@/lib/api";

function fmtDateStr(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateRange(r: AdminRequest) {
  if (!r.startDate) return "—";
  if (!r.endDate || r.endDate === r.startDate) return fmtDateStr(r.startDate);
  return `${fmtDateStr(r.startDate)} – ${fmtDateStr(r.endDate)}`;
}

const PLACE_LABEL: Record<string, string> = { inCity: "Dalam kota", outside: "Luar Jawa" };

/** Bottom sheet showing a request's complete details, so the admin reviews
 *  before approving. Rejecting requires a reason (relayed to the applicant). */
export function RequestSheet({
  req,
  busy,
  onClose,
  onDecide,
}: {
  req: AdminRequest;
  busy: boolean;
  onClose: () => void;
  onDecide: (decision: "Disetujui" | "Ditolak", reason?: string) => void;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pending = req.status === "Menunggu";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/35"
        style={{ opacity: shown ? 1 : 0, transition: "opacity .25s ease" }}
        onClick={onClose}
      />
      <div
        className="relative mx-auto w-full max-w-[430px] bg-bg rounded-t-[24px] px-6 pt-3 pb-8 max-h-[88vh] overflow-y-auto"
        style={{
          boxShadow: "0 -10px 40px rgba(80,20,80,0.18)",
          transform: shown ? "translateY(0)" : "translateY(100%)",
          transition: "transform .25s ease",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line2" />
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="text-[19px] font-extrabold text-ink tracking-[-0.3px]">{req.title}</div>
            <div className="text-[13px] text-muted font-semibold">{req.userName}</div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="w-9 h-9 rounded-[11px] bg-tint text-ink flex items-center justify-center shrink-0"
          >
            {Ic.x}
          </button>
        </div>

        <SummaryCard>
          {req.kind === "cuti" && (
            <>
              <Row k="Jenis" v={req.title} />
              <Row k="Tanggal" v={dateRange(req)} />
              <Row k="Durasi" v={req.days ? `${req.days} hari` : "—"} />
              {req.leaveType === "sakit" && (
                <Row k="Surat dokter" v={req.doctorNote ? "Terlampir" : "Tidak ada"} />
              )}
              {req.place && <Row k="Lokasi" v={PLACE_LABEL[req.place] ?? req.place} />}
            </>
          )}
          {req.kind === "dinas" && (
            <>
              <Row k="Tujuan" v={req.dest ?? "—"} />
              <Row k="Tanggal" v={dateRange(req)} />
              <Row
                k="Durasi"
                v={req.nights && req.nights > 0 ? `${req.nights + 1} hari · ${req.nights} malam` : "1 hari"}
              />
              <Row k="Tunjangan" v={req.amount && req.amount > 0 ? fmtIDR(req.amount) : "—"} />
            </>
          )}
          {req.kind === "lembur" && (
            <>
              <Row k="Tanggal" v={dateRange(req)} />
              <Row k="Durasi" v={req.hours != null ? `${req.hours.toLocaleString("id-ID")} jam` : "—"} />
            </>
          )}
          <Row k="Diajukan" v={fmtDateStr(req.createdAt.slice(0, 10))} />
          <Row k="Status" v={req.status} last />
        </SummaryCard>

        {req.status === "Ditolak" && req.rejectReason && (
          <div className="mt-3 rounded-[13px] px-4 py-3 text-[13px]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <b>Alasan penolakan:</b> {req.rejectReason}
          </div>
        )}

        {pending && !rejecting && (
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide("Disetujui")}
              className="flex-1 py-[13px] rounded-[13px] border-none text-white text-[14px] font-extrabold cursor-pointer disabled:opacity-60"
              style={{ background: "var(--grad)" }}
            >
              Setujui
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="flex-1 py-[13px] rounded-[13px] bg-transparent text-[14px] font-extrabold cursor-pointer disabled:opacity-60"
              style={{ border: "1.5px solid var(--line2)", color: "var(--danger)" }}
            >
              Tolak
            </button>
          </div>
        )}

        {pending && rejecting && (
          <div className="mt-5">
            <div className="text-[12.5px] font-extrabold text-ink mb-2 uppercase tracking-[0.4px]">
              Alasan penolakan
            </div>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="cth. Tanggal bentrok dengan jadwal pelayanan — ajukan tanggal lain."
              rows={3}
              className="w-full rounded-[13px] border border-line2 bg-card px-4 py-3 text-[14px] text-ink font-sans outline-none focus:border-primary resize-none"
            />
            <div className="text-[11px] text-muted mt-1 mb-3">
              Alasan ini akan ditampilkan ke karyawan yang mengajukan.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !reason.trim()}
                onClick={() => onDecide("Ditolak", reason.trim())}
                className="flex-1 py-[13px] rounded-[13px] border-none text-white text-[14px] font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--danger)" }}
              >
                {busy ? "Menolak…" : "Konfirmasi Tolak"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejecting(false)}
                className="px-5 py-[13px] rounded-[13px] bg-transparent text-[14px] font-extrabold text-muted cursor-pointer"
                style={{ border: "1.5px solid var(--line2)" }}
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
