"use client";

import { EditMemoryError } from "@/features/memories/pages/edit-memory/error";

type ErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function EditMemoryRouteError({ reset }: Readonly<ErrorProps>) {
  return <EditMemoryError onRetry={reset} />;
}
