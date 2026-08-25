import type { ReactNode } from "react";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: Readonly<LayoutProps>) {
  return <DashboardPage activeSection="timeline">{children}</DashboardPage>;
}
