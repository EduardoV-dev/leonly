import { notFound } from "next/navigation";
import { VaultMemoryDetailPage } from "@/features/memories/pages/vault-memory-detail";
import { getRelatedVaultMemories } from "@/features/memories/server/get-related-vault-memories";
import { getVaultMemoryDetail } from "@/features/memories/server/get-vault-memory-detail";

type PageProps = { params: Promise<{ memoryId: string }> };

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memoryPromise = getVaultMemoryDetail(memoryId);
  const relatedMemoriesPromise = getRelatedVaultMemories(memoryId);
  const [memory, relatedMemories] = await Promise.all([memoryPromise, relatedMemoriesPromise]);

  if (!memory) {
    notFound();
  }

  return <VaultMemoryDetailPage memory={memory} relatedMemories={relatedMemories} />;
}
