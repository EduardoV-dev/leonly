import {
  SPACE_SETUP_STEPS,
  SpaceCreateSetupPage,
  type SpaceSetupCreateSteps,
} from "@/features/space-setup";
import { getQueryParams } from "@/utils/router";

const createStepScreens: Record<string, SpaceSetupCreateSteps> = {
  name: SPACE_SETUP_STEPS.CREATE_NAME,
  date: SPACE_SETUP_STEPS.CREATE_DATE,
  invite: SPACE_SETUP_STEPS.CREATE_INVITE,
};

type CreateSpacePageProps = {
  searchParams?: Promise<{
    step?: string | string[];
  }>;
};

export default async function CreateSpacePage({ searchParams }: CreateSpacePageProps) {
  const { step } = await getQueryParams(searchParams, ["step"]);
  const screen = createStepScreens[step || "name"];

  return <SpaceCreateSetupPage screen={screen} />;
}
