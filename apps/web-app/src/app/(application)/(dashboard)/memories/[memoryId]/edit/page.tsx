import { notFound } from "next/navigation";
import { EditMemoryPage } from "@/features/memories/pages/edit-memory";
import { getMemoryForEditing } from "@/features/memories/server/get-memory-for-editing";

type PageProps = { params: Promise<{ memoryId: string }> };

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memory = await getMemoryForEditing(memoryId);
  if (!memory) notFound();
  return <EditMemoryPage memory={memory} />;
}
