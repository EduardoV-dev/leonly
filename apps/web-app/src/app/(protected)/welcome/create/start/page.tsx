import { SPACE_SETUP_STEPS, SpaceCreateSetupPage } from "@/features/space-setup";

export default async function CreateStartPage() {
  return <SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_START} />;
}
