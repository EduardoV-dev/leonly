import type { Metadata } from "next";
import { CreateMemoryPage } from "@/features/memories/pages/create-memory";

export const metadata: Metadata = {
  title: "New memory",
  description: "Add a new moment to your shared story.",
};

export default function Page() {
  return <CreateMemoryPage />;
}
