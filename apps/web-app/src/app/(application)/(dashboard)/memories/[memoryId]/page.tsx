import { notFound } from "next/navigation";
import { MemoryDetailPage } from "@/features/memories/pages/memory-detail";
import { getMemoryDetail } from "@/features/memories/server/get-memory-detail";
import { getRelatedMemories } from "@/features/memories/server/get-related-memories";

type PageProps = { params: Promise<{ memoryId: string }> };

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memoryPromise = getMemoryDetail(memoryId);
  const relatedMemoriesPromise = getRelatedMemories(memoryId);
  const [memory, relatedMemories] = await Promise.all([memoryPromise, relatedMemoriesPromise]);

  if (!memory) {
    notFound();
  }

  return <MemoryDetailPage memory={memory} relatedMemories={relatedMemories} />;
}
