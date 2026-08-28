"use client";

import { MemoryDetailError } from "@/features/memories/pages/memory-detail/error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function VaultMemoryDetailRouteError({ reset }: Readonly<ErrorProps>) {
  return <MemoryDetailError onRetry={reset} />;
}
