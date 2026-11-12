"use client";

import { EditMemoryError } from "@/features/memories/pages/edit-memory/error";
import { useCaptureRouteError } from "@/hooks/use-capture-route-error";

type ErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function EditMemoryRouteError({ error, reset }: Readonly<ErrorProps>) {
  useCaptureRouteError(error);

  return <EditMemoryError onRetry={reset} />;
}
