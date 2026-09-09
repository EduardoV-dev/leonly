"use client";

import { SettingsError } from "@/features/settings/pages/settings-page/error";
import { useCaptureRouteError } from "@/hooks/use-capture-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SettingsRouteError({ error, reset }: Readonly<ErrorProps>) {
  useCaptureRouteError(error);

  return <SettingsError onRetry={reset} />;
}
