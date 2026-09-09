import type { Metadata } from "next";
import { TimelinePage } from "@/features/memories/pages/timeline-page";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Browse the moments you have shared together.",
};

export default function Page() {
  return <TimelinePage />;
}
