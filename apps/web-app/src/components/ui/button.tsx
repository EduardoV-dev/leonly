import { mergeClassNames } from "@/utils/merge-class-names";
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={mergeClassNames(
        "inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-auth-button-border bg-auth-button px-6 text-[1.25rem] font-semibold text-auth-button-text shadow-sm transition-transform duration-300 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
