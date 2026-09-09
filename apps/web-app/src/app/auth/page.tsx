import type { Metadata } from "next";
import { SignInPage } from "@/features/auth/pages/sign-in";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to continue preserving your shared memories.",
};

export default function Page() {
  return <SignInPage />;
}
