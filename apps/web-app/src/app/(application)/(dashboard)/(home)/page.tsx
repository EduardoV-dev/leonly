import { DashboardContent } from "@/features/dashboard/pages/dashboard-page/dashboard-content";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";

export default async function Page() {
  const activeSpace = await getActiveSpaceForCurrentUser();

  if (!activeSpace) {
    throw new Error("No active space is available for the dashboard.");
  }

  return <DashboardContent activeSpace={activeSpace} />;
}
