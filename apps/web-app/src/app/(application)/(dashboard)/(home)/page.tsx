import type { Metadata } from "next";
import { DashboardContent } from "@/features/dashboard/pages/dashboard-page/dashboard-content";

export const metadata: Metadata = {
  title: "Home",
  description: "Your shared space and most recent memories.",
};

export default function Page() {
  return <DashboardContent />;
}
