import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditMemoryPage } from "@/features/memories/pages/edit-memory";
import { getMemoryForEditing } from "@/features/memories/server/get-memory-for-editing";

type PageProps = { params: Promise<{ memoryId: string }> };

export async function generateMetadata({ params }: Readonly<PageProps>): Promise<Metadata> {
  const { memoryId } = await params;
  const memory = await getMemoryForEditing(memoryId);

  if (!memory) {
    return {
      title: "Memory unavailable",
      description: "This memory is unavailable for editing.",
    };
  }

  return {
    title: `Edit ${memory.title}`,
    description: memory.description ?? "Update this shared memory in Leonly.",
  };
}

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memory = await getMemoryForEditing(memoryId);
  if (!memory) notFound();
  return <EditMemoryPage memory={memory} />;
}
