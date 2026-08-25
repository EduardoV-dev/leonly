import { notFound } from "next/navigation";
import { MemoryDetailPage } from "@/features/memories/pages/memory-detail";
import { getMemoryDetail } from "@/features/memories/server/get-memory-detail";

type PageProps = {
  params: Promise<{ memoryId: string }>;
};

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memory = await getMemoryDetail(memoryId);

  if (!memory) {
    notFound();
  }

  return <MemoryDetailPage memory={memory} />;
}
