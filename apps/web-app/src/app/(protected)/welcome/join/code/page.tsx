import { SPACE_SETUP_STEPS, SpaceJoinSetupPage } from "@/features/space-setup";

export default async function JoinCodePage() {
  return <SpaceJoinSetupPage screen={SPACE_SETUP_STEPS.JOIN_CODE} />;
}
