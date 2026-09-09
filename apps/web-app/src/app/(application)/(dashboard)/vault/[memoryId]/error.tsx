"use client";

import { MemoryDetailError } from "@/features/memories/pages/memory-detail/error";
import { useCaptureRouteError } from "@/hooks/use-capture-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function VaultMemoryDetailRouteError({ error, reset }: Readonly<ErrorProps>) {
  useCaptureRouteError(error);

  return <MemoryDetailError onRetry={reset} />;
}
