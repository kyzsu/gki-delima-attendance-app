import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans font-bold cursor-pointer transition-all duration-150 outline-none focus-visible:ring-4 focus-visible:ring-[rgba(193,58,214,0.25)] disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // gradient primary (.gki-primary)
        primary:
          "w-full border-none text-white text-[16px] py-4 px-4 rounded-[16px] " +
          "bg-[image:var(--grad)] shadow-[0_10px_24px_var(--glow)] " +
          "hover:-translate-y-px hover:brightness-105 hover:shadow-[0_14px_30px_var(--glow)] active:translate-y-0 " +
          "disabled:bg-none disabled:bg-line2 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100",
        // white pill w/ gradient-tinted text, on gradient bg (.gki-primary.gki-light)
        light:
          "w-full border-none text-[#B232C5] text-[16px] py-4 px-4 rounded-[16px] " +
          "bg-white shadow-[0_10px_30px_rgba(0,0,0,0.16)] hover:-translate-y-px active:translate-y-0",
        // translucent ghost on gradient bg (.gki-ghost)
        ghost:
          "w-full text-white text-[16px] py-[15px] px-4 rounded-[16px] " +
          "bg-[rgba(255,255,255,0.12)] border-[1.5px] border-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.22)]",
        // outline ghost on light bg (.gki-ghost-dark)
        outline:
          "w-full text-primary text-[15px] py-[15px] px-4 rounded-[16px] " +
          "bg-transparent border-[1.5px] border-line2 hover:bg-tint",
        // square icon button (.gki-back)
        back:
          "w-10 h-10 rounded-[12px] bg-tint border-none text-ink hover:bg-tint2 p-0",
        // stepper square (.gki-step)
        step:
          "w-[34px] h-[34px] rounded-[10px] border border-line2 bg-card text-primary hover:bg-tint p-0",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
