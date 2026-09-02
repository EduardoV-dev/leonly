import type React from "react";
import { cn } from "@/utils/merge-class-names";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  size?: "compact" | "default";
};

const buttonSizeClasses = {
  compact:
    "h-11 w-fit rounded-[0.6rem] px-4 text-[0.8rem] font-extrabold [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
  default:
    "h-14 w-full rounded-2xl px-4 text-base font-semibold sm:gap-3 sm:px-6 sm:text-[1.25rem]",
} as const;

export function Button({
  children,
  className,
  disabled,
  loading = false,
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap border border-auth-button-border bg-auth-button text-auth-button-text shadow-sm transition-[background-color,border-color,box-shadow,opacity,transform] duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-auth-button-border/45 disabled:bg-auth-button/65 disabled:opacity-70 disabled:shadow-none disabled:hover:translate-y-0",
        buttonSizeClasses[size],
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
