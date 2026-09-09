import type { Metadata } from "next";
import { PrivateVaultPage } from "@/features/memories/pages/private-vault";

export const metadata: Metadata = {
  title: "Private Vault",
  description: "Browse memories kept in your private vault.",
};

export default function Page() {
  return <PrivateVaultPage />;
}
