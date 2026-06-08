import { notFound } from "next/navigation";

import { SpaceSetupPage, type SpaceSetupScreen } from "@/features/space-setup";

const createStepScreens: Record<string, SpaceSetupScreen> = {
  "1": "create-name",
  "2": "create-date",
  "3": "create-invite",
};

type CreateSpacePageProps = {
  searchParams?: Promise<{
    step?: string | string[];
  }>;
};

export default async function CreateSpacePage({ searchParams }: CreateSpacePageProps) {
  const params = await searchParams;
  const step = Array.isArray(params?.step) ? params.step[0] : params?.step;
  const screen = createStepScreens[step ?? "1"];

  if (!screen) {
    notFound();
  }

  return <SpaceSetupPage screen={screen} />;
}
