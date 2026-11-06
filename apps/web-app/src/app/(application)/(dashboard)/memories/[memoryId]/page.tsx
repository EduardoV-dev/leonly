import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemoryDetailPage } from "@/features/memories/pages/memory-detail";
import { getCurrentMemoryDetail } from "@/features/memories/server/get-current-memory-detail";

type PageProps = { params: Promise<{ memoryId: string }> };

export async function generateMetadata({ params }: Readonly<PageProps>): Promise<Metadata> {
  const { memoryId } = await params;
  const memory = await getCurrentMemoryDetail({ memoryId, visibility: "timeline" });

  if (!memory) {
    return {
      title: "Memory unavailable",
      description: "This shared memory is unavailable.",
    };
  }

  return {
    title: memory.title,
    description: memory.description ?? "A shared memory in Leonly.",
  };
}

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memory = await getCurrentMemoryDetail({ memoryId, visibility: "timeline" });

  if (!memory) {
    notFound();
  }

  return <MemoryDetailPage memory={memory} relatedMemories={memory.relatedMemories} />;
}
