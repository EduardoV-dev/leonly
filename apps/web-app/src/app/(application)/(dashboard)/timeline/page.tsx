import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { TimelinePage } from "@/features/memories/pages/timeline-page";

export default async function Page() {
  return (
    <DashboardPage activeSection="timeline">
      <TimelinePage />
    </DashboardPage>
  );
}
