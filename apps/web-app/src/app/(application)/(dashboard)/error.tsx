"use client";

import { DashboardError } from "@/features/dashboard/pages/dashboard-page/error";
import { useCaptureRouteError } from "@/hooks/use-capture-route-error";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardRouteError({ error, reset }: Readonly<ErrorProps>) {
  useCaptureRouteError(error);

  return <DashboardError error={error} reset={reset} />;
}
