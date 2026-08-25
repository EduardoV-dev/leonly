import type { ReactNode } from "react";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: Readonly<DashboardLayoutProps>) {
  return <DashboardPage>{children}</DashboardPage>;
}
