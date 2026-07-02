import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StepHead } from "@/components/screen-head";
import { Ic } from "@/components/icons";
import { api } from "@/lib/api";
import { useSignup } from "./signup-context";

export function Step3Screen() {
  const navigate = useNavigate();
  const { draft, patch } = useSignup();
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.signup({
        name: draft.name.trim(),
        nip: draft.nip.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        password: draft.password,
        agreed: true,
      });
      navigate("/signup/approval", { state: { signupId: res.id, name: draft.name.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPhoto((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
  }

  return (
    <div className="flex flex-col flex-1 bg-bg px-7 pt-safe-58 pb-11">
      <StepHead step={3} title="Foto presensi" sub="Digunakan untuk verifikasi wajah saat check-in." backTo="/signup/step-2" />

      <div className="flex flex-col items-center gap-[14px] mb-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Ambil atau unggah foto"
            className="w-[168px] h-[168px] rounded-full border-none cursor-pointer overflow-hidden bg-tint2 flex items-center justify-center"
          >
            {photo ? (
              <img src={photo} alt="Foto presensi" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[12.5px] font-bold text-muted px-4">Ambil / unggah foto</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Buka kamera"
            className="absolute bottom-1 right-1 w-[46px] h-[46px] rounded-full text-white flex items-center justify-center border-[3px] border-bg cursor-pointer"
            style={{ background: "var(--grad)", boxShadow: "0 6px 16px var(--glow)" }}
          >
            {Ic.camera}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPick} />
        </div>
        <p className="text-[13px] text-muted text-center m-0 leading-[1.5] max-w-[260px]">
          Pastikan wajah terlihat jelas, pencahayaan cukup, dan tanpa penutup wajah.
        </p>
      </div>

      <div className="flex-1 min-h-4" />

      <label className="flex items-start gap-[10px] mb-4 cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={draft.agreed}
          onChange={(e) => patch({ agreed: e.target.checked })}
        />
        <span
          className="w-[22px] h-[22px] rounded-[7px] shrink-0 mt-px flex items-center justify-center text-white"
          style={{
            background: draft.agreed ? "var(--grad)" : "transparent",
            border: draft.agreed ? "none" : "2px solid var(--line2)",
          }}
        >
          {draft.agreed ? Ic.check : null}
        </span>
        <span className="text-[12.5px] text-muted leading-[1.5]">
          Saya menyetujui penggunaan data wajah untuk verifikasi kehadiran sesuai{" "}
          <a className="text-primary font-semibold cursor-pointer hover:underline">kebijakan privasi</a> GKI Delima.
        </span>
      </label>

      {error && (
        <div
          className="mb-3 rounded-[13px] px-4 py-3 text-[13px] font-semibold"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}
      <Button variant="primary" disabled={!draft.agreed || busy} onClick={submit}>
        {busy ? "Mengirim…" : "Kirim Pendaftaran"}
      </Button>
    </div>
  );
}
