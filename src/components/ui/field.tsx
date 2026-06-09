import * as React from "react";
import { cn } from "@/lib/utils";
import { Ic } from "@/components/icons";

export function FieldLabel({
  children,
  hint,
  upper,
}: {
  children: React.ReactNode;
  hint?: string;
  upper?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline mb-[7px]">
      <span
        className={cn(
          "text-[12px] font-bold text-muted tracking-[0.3px]",
          upper && "uppercase",
        )}
      >
        {children}
      </span>
      {hint && <span className="text-[11px] text-muted font-medium">{hint}</span>}
    </div>
  );
}

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, icon, trailing, className, ...props }, ref) => (
    <div className="mb-[13px]">
      <label className="text-[12.5px] font-bold text-muted mb-[6px] block tracking-[0.1px]">
        {label}
      </label>
      <div className={cn("gki-field", className)}>
        {icon && <span className="text-muted flex shrink-0">{icon}</span>}
        <input
          ref={ref}
          className="flex-1 border-none outline-none bg-transparent text-[15px] font-sans text-ink font-medium min-w-0 placeholder:text-muted/70"
          {...props}
        />
        {trailing}
      </div>
    </div>
  ),
);
Field.displayName = "Field";

export function PasswordField(props: Omit<FieldProps, "type" | "trailing" | "icon">) {
  const [show, setShow] = React.useState(false);
  return (
    <Field
      {...props}
      icon={Ic.lock}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="border-none bg-transparent p-0 cursor-pointer text-muted flex"
        >
          {show ? Ic.eyeOff : Ic.eye}
        </button>
      }
    />
  );
}

/** Read-only display field (.gki-field as PseudoField) */
export function PseudoField({
  icon,
  children,
  onClick,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={cn("gki-field", onClick && "cursor-pointer")} onClick={onClick}>
      {icon && <span className="text-muted flex shrink-0">{icon}</span>}
      <span className="flex-1 text-[14.5px] font-semibold text-ink">{children}</span>
    </div>
  );
}
