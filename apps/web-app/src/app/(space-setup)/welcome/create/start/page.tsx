import type { Metadata } from "next";
import { SPACE_SETUP_STEPS, SpaceCreateSetupPage } from "@/features/space-setup";

export const metadata: Metadata = {
  title: "Create your space",
  description: "Start creating a private place for your shared memories.",
};

export default function CreateStartPage() {
  return <SpaceCreateSetupPage screen={SPACE_SETUP_STEPS.CREATE_START} />;
}
