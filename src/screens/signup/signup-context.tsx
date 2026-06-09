import * as React from "react";

export interface SignupDraft {
  name: string;
  nip: string;
  email: string;
  phone: string;
  password: string;
  agreed: boolean;
}

const empty: SignupDraft = { name: "", nip: "", email: "", phone: "", password: "", agreed: false };

const Ctx = React.createContext<{
  draft: SignupDraft;
  patch: (p: Partial<SignupDraft>) => void;
} | null>(null);

export function SignupProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = React.useState<SignupDraft>(empty);
  const patch = React.useCallback((p: Partial<SignupDraft>) => setDraft((d) => ({ ...d, ...p })), []);
  return <Ctx.Provider value={{ draft, patch }}>{children}</Ctx.Provider>;
}

export function useSignup() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useSignup must be used within SignupProvider");
  return ctx;
}
