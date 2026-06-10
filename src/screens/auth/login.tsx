import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "@/components/ui/field";
import { BrandMark } from "@/components/brand-mark";
import { Ic } from "@/components/icons";
import { useApp } from "@/app/store";

export function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg px-7 pt-[70px] pb-11">
      <BrandMark size={52} />
      <h1 className="text-[27px] font-extrabold text-ink mt-[22px] mb-[6px] tracking-[-0.5px]">
        Selamat datang kembali
      </h1>
      <p className="text-[14.5px] text-muted mb-7 leading-[1.45]">
        Masuk untuk mulai mencatat kehadiran Anda.
      </p>

      <form className="contents" onSubmit={submit}>
        <Field label="Email" icon={Ic.mail} type="email" placeholder="nama@gkidelima.org" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordField label="Kata Sandi" placeholder="Masukkan kata sandi" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="text-right mt-[2px] mb-[22px]">
          <a className="text-primary text-[13.5px] font-semibold cursor-pointer hover:underline">Lupa kata sandi?</a>
        </div>
        {error && (
          <div
            className="mb-3 rounded-[13px] px-4 py-3 text-[13px] font-semibold"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {error}
          </div>
        )}
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>

      <div className="flex-1" />
      <div className="text-center text-[14px] text-muted">
        Belum punya akun?{" "}
        <Link to="/signup/step-1" className="text-primary text-[13.5px] font-bold no-underline hover:underline">
          Daftar di sini
        </Link>
      </div>
    </div>
  );
}
