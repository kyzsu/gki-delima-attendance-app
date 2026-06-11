import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Note } from "@/components/ui/note";
import { BrandMark } from "@/components/brand-mark";
import { Ic } from "@/components/icons";
import { api } from "@/lib/api";

/** "Lupa kata sandi" — records a reset request; the Koordinator Personalia
 *  hands over a temporary password in person (no email service). */
export function ForgotScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.forgotPassword(email);
      setSent(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg px-7 pt-[70px] pb-11">
      <BrandMark size={52} />
      <h1 className="text-[27px] font-extrabold text-ink mt-[22px] mb-[6px] tracking-[-0.5px]">
        Lupa kata sandi
      </h1>
      <p className="text-[14.5px] text-muted mb-7 leading-[1.45]">
        Masukkan email Anda. Koordinator Personalia akan menyiapkan kata sandi sementara untuk Anda.
      </p>

      {sent ? (
        <>
          <Note tone="ok" icon={Ic.check}>{sent}</Note>
          <div className="mt-5">
            <Button variant="primary" onClick={() => navigate("/login")}>Kembali ke Masuk</Button>
          </div>
        </>
      ) : (
        <form className="contents" onSubmit={submit}>
          <Field label="Email" icon={Ic.mail} type="email" placeholder="nama@gkidelima.org" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && (
            <div className="mb-3">
              <Note tone="danger" icon={Ic.alert}>{error}</Note>
            </div>
          )}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim Permintaan"}
          </Button>
        </form>
      )}

      <div className="flex-1" />
      <div className="text-center text-[14px] text-muted">
        Ingat kata sandi?{" "}
        <Link to="/login" className="text-primary text-[13.5px] font-bold no-underline hover:underline">
          Masuk
        </Link>
      </div>
    </div>
  );
}
