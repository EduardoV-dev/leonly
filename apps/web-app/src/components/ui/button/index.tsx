import { cn } from "@/utils/merge-class-names";
import type React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function Button({
  children,
  className,
  disabled,
  loading = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-14 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-auth-button-border bg-auth-button px-4 text-base font-semibold text-auth-button-text shadow-sm transition-[background-color,border-color,box-shadow,opacity,transform] duration-300 hover:-translate-y-0.5 sm:gap-3 sm:px-6 sm:text-[1.25rem] disabled:cursor-not-allowed disabled:border-auth-button-border/45 disabled:bg-auth-button/65 disabled:opacity-70 disabled:shadow-none disabled:hover:translate-y-0",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full border-2 border-auth-button-text/35 border-t-auth-button-text animate-spin"
        />
      ) : null}
      {children}
    </button>
  );
}
