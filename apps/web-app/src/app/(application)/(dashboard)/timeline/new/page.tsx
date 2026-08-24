import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { CreateMemoryPage } from "@/features/memories/pages/create-memory";

export default async function Page() {
  return (
    <DashboardPage activeSection="timeline">
      <CreateMemoryPage />
    </DashboardPage>
  );
}
