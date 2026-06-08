import { SpaceSetupPage, type SpaceSetupScreen } from "@/features/space-setup";

type WelcomePageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams;
  const tab = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
  const screen: SpaceSetupScreen = tab === "join" ? "join" : "start";

  return <SpaceSetupPage screen={screen} />;
}
