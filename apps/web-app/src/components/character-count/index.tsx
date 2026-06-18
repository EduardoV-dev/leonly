import { cn } from "@/utils/merge-class-names";
import styles from "./character-count.module.css";

type CharacterCountProps = {
  value: string;
  max: number;
  className?: string;
};

export function CharacterCount({ value, max, className }: CharacterCountProps) {
  const count = value.length;
  const isOverLimit = count > max;

  return (
    <span
      className={cn(styles.count, isOverLimit && styles.overLimit, className)}
      aria-live="polite"
    >
      {count}/{max}
    </span>
  );
}
