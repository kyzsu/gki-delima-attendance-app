import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/field";
import { StepHead } from "@/components/screen-head";
import { Ic } from "@/components/icons";
import { useSignup } from "./signup-context";

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px]" style={{ color: ok ? "var(--text)" : "var(--muted)" }}>
      <span
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white shrink-0"
        style={{ background: ok ? "var(--grad)" : "var(--line)" }}
      >
        {ok ? Ic.check : null}
      </span>
      {children}
    </div>
  );
}

export function Step2Screen() {
  const navigate = useNavigate();
  const { draft, patch } = useSignup();
  const [pw, setPw] = React.useState(draft.password);
  const [pw2, setPw2] = React.useState(draft.password);

  const rules = {
    len: pw.length >= 8,
    caseMix: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    num: /\d/.test(pw),
  };
  const valid = rules.len && rules.caseMix && rules.num && pw === pw2;

  return (
    <div className="flex flex-col flex-1 bg-bg px-7 pt-safe-58 pb-11">
      <StepHead step={2} title="Buat kata sandi" sub="Lindungi akun presensi Anda dengan kata sandi yang kuat." backTo="/signup/step-1" />
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          patch({ password: pw });
          navigate("/signup/step-3");
        }}
      >
        <PasswordField label="KATA SANDI" placeholder="Buat kata sandi"
          value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
        <PasswordField label="KONFIRMASI KATA SANDI" placeholder="Ulangi kata sandi"
          value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
        <div className="flex flex-col gap-[10px] mt-4 p-4 bg-tint rounded-[16px]">
          <Rule ok={rules.len}>Minimal 8 karakter</Rule>
          <Rule ok={rules.caseMix}>Mengandung huruf besar &amp; kecil</Rule>
          <Rule ok={rules.num}>Mengandung angka</Rule>
          {pw2.length > 0 && <Rule ok={pw === pw2}>Konfirmasi cocok</Rule>}
        </div>
        <div className="flex-1 min-h-4" />
        <Button variant="primary" type="submit" disabled={!valid}>Lanjut</Button>
      </form>
    </div>
  );
}
