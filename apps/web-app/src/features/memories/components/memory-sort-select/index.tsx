"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import type { MemorySort } from "../../constants/memory-sort";
import styles from "./memory-sort-select.module.css";

type MemorySortSelectProps = Readonly<{
  label: string;
  newestLabel: string;
  oldestLabel: string;
  onChange: (sort: MemorySort) => void;
  value: MemorySort;
}>;

export function MemorySortSelect({
  label,
  newestLabel,
  oldestLabel,
  onChange,
  value,
}: MemorySortSelectProps) {
  const id = useId();

  return (
    <div className={styles.control}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.selectWrapper}>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as MemorySort)}
        >
          <option value="newest">{newestLabel}</option>
          <option value="oldest">{oldestLabel}</option>
        </select>
        <ChevronDown aria-hidden="true" />
      </div>
    </div>
  );
}
