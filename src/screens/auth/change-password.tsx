import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/field";
import { Note } from "@/components/ui/note";
import { BrandMark } from "@/components/brand-mark";
import { Ic } from "@/components/icons";
import { useApp } from "@/app/store";
import { api } from "@/lib/api";

/** Set a new password — entered voluntarily from the profile, or forced
 *  after an admin reset (temporary passwords are single-use). */
export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const { user, refresh } = useApp();
  const [current, setCurrent] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const valid = pw.length >= 8 && pw === pw2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, pw);
      await refresh();
      navigate(user.role === "admin" ? "/admin" : "/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg px-7 pt-[70px] pb-11">
      <BrandMark size={52} />
      <h1 className="text-[27px] font-extrabold text-ink mt-[22px] mb-[6px] tracking-[-0.5px]">
        Buat kata sandi baru
      </h1>
      <p className="text-[14.5px] text-muted mb-6 leading-[1.45]">
        {user.mustChangePassword
          ? "Anda masuk dengan kata sandi sementara — buat kata sandi baru untuk melanjutkan."
          : "Masukkan kata sandi saat ini, lalu pilih yang baru."}
      </p>

      <form className="contents" onSubmit={submit}>
        <PasswordField label="Kata Sandi Saat Ini" placeholder="Kata sandi sementara / lama"
          value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        <PasswordField label="Kata Sandi Baru" placeholder="Minimal 8 karakter"
          value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
        <PasswordField label="Konfirmasi Kata Sandi Baru" placeholder="Ulangi kata sandi baru"
          value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
        {pw2.length > 0 && pw !== pw2 && (
          <div className="mb-3">
            <Note tone="warn" icon={Ic.alert}>Konfirmasi kata sandi belum cocok.</Note>
          </div>
        )}
        {error && (
          <div className="mb-3">
            <Note tone="danger" icon={Ic.alert}>{error}</Note>
          </div>
        )}
        <Button variant="primary" type="submit" disabled={!valid || busy}>
          {busy ? "Menyimpan…" : "Simpan Kata Sandi"}
        </Button>
      </form>
      <div className="flex-1" />
    </div>
  );
}
