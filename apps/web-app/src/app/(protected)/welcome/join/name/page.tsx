import { SPACE_SETUP_STEPS, SpaceJoinSetupPage } from "@/features/space-setup";

export default async function JoinNamePage() {
  return <SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_NAME} />;
}
