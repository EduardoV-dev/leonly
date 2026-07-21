import { FaHeart } from "react-icons/fa6";
import { cn } from "@/utils/merge-class-names";

type LeonlyLogoProps = {
  className?: string;
  iconClassName?: string;
  label?: string;
};

export function LeonlyLogo({ className, iconClassName, label = "Leonly" }: LeonlyLogoProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-3 font-display text-[2.1rem] font-[600] leading-none tracking-[-0.02em] text-auth-brand sm:text-[2.45rem] select-none",
        className,
      )}
    >
      <FaHeart className={cn("text-[0.78em]", iconClassName)} aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}
