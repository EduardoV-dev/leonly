"use client";

import { SettingsError } from "@/features/settings/pages/settings-page/error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SettingsRouteError({ reset }: Readonly<ErrorProps>) {
  return <SettingsError onRetry={reset} />;
}
