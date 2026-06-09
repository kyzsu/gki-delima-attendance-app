import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StepHead } from "@/components/screen-head";
import { Ic } from "@/components/icons";
import { useSignup } from "./signup-context";

export function Step1Screen() {
  const navigate = useNavigate();
  const { draft, patch } = useSignup();
  return (
    <div className="flex flex-col flex-1 bg-bg px-7 pt-[58px] pb-11">
      <StepHead step={1} title="Data diri" sub="Isi sesuai data kepegawaian GKI Delima." backTo="/" />
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/signup/step-2");
        }}
      >
        <Field label="NAMA LENGKAP" icon={Ic.user} placeholder="cth. Ruth Simanjuntak"
          value={draft.name} onChange={(e) => patch({ name: e.target.value })} required />
        <Field label="NIP / ID KARYAWAN" icon={Ic.id} placeholder="cth. GKD-2025-018"
          value={draft.nip} onChange={(e) => patch({ nip: e.target.value })} required />
        <Field label="EMAIL" icon={Ic.mail} type="email" placeholder="nama@gkidelima.org"
          value={draft.email} onChange={(e) => patch({ email: e.target.value })} autoComplete="email" required />
        <Field label="NOMOR HP" icon={Ic.phone} type="tel" placeholder="08xx xxxx xxxx"
          value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} autoComplete="tel" required />
        <div className="flex-1 min-h-4" />
        <Button variant="primary" type="submit">Lanjut</Button>
      </form>
    </div>
  );
}
