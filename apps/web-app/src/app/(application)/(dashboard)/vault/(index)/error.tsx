"use client";

import { PrivateVaultError } from "@/features/memories/pages/private-vault/error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PrivateVaultRouteError({ reset }: Readonly<ErrorProps>) {
  return <PrivateVaultError onRetry={reset} />;
}
