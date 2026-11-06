import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VaultMemoryDetailPage } from "@/features/memories/pages/vault-memory-detail";
import { getCurrentMemoryDetail } from "@/features/memories/server/get-current-memory-detail";

type PageProps = { params: Promise<{ memoryId: string }> };

export async function generateMetadata({ params }: Readonly<PageProps>): Promise<Metadata> {
  const { memoryId } = await params;
  const memory = await getCurrentMemoryDetail({ memoryId, visibility: "vault" });

  if (!memory) {
    return {
      title: "Memory unavailable",
      description: "This private memory is unavailable.",
    };
  }

  return {
    title: memory.title,
    description: memory.description ?? "A private memory in Leonly.",
  };
}

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memory = await getCurrentMemoryDetail({ memoryId, visibility: "vault" });

  if (!memory) {
    notFound();
  }

  return <VaultMemoryDetailPage memory={memory} relatedMemories={memory.relatedMemories} />;
}
