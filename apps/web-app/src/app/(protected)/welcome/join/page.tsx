import {
  SPACE_SETUP_STEPS,
  SpaceJoinSetupPage,
  type SpaceSetupJoinSteps,
} from "@/features/space-setup";
import { getQueryParams } from "@/utils/router";

const joinStepScreens: Record<string, SpaceSetupJoinSteps> = {
  code: SPACE_SETUP_STEPS.JOIN_CODE,
  name: SPACE_SETUP_STEPS.JOIN_NAME,
};

type JoinSpacePageProps = {
  searchParams?: Promise<{
    step?: string | string[];
  }>;
};

export default async function JoinSpacePage({ searchParams }: JoinSpacePageProps) {
  const { step } = await getQueryParams(searchParams, ["step"]);

  const screen = joinStepScreens[step || "code"];

  return <SpaceJoinSetupPage screen={screen} />;
}
