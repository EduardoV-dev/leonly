import { mergeClassNames } from "@/utils/merge-class-names";
import React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={mergeClassNames(
        "animate-pulse rounded-md bg-muted",
        className,
      )}
      {...props}
    />
  );
}
