"use client";

import { PrivateVaultError } from "@/features/memories/pages/private-vault/error";
import { useCaptureRouteError } from "@/hooks/use-capture-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PrivateVaultRouteError({ error, reset }: Readonly<ErrorProps>) {
  useCaptureRouteError(error);

  return <PrivateVaultError onRetry={reset} />;
}
