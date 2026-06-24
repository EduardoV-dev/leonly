import { SPACE_SETUP_STEPS, SpaceCreateSetupPage } from "@/features/space-setup";

export default async function CreateInvitePage() {
  return <SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_INVITE} />;
}
