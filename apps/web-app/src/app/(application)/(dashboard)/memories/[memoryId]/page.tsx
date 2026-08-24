import { notFound } from "next/navigation";
import { getAvailableMemory } from "@/features/memories/server/get-available-memory";
import { getCoverPreviewUrl } from "@/features/memories/server/get-cover-preview-url";

type PageProps = {
  params: Promise<{ memoryId: string }>;
};

export default async function Page({ params }: Readonly<PageProps>) {
  const { memoryId } = await params;
  const memory = await getAvailableMemory(memoryId);

  if (!memory) {
    notFound();
  }

  const coverPhotoUrl = await getCoverPreviewUrl(memory.id);

  return (
    <main>
      <h1>{memory.title}</h1>
      <p>{memory.memoryDate}</p>
      {coverPhotoUrl ? (
        // biome-ignore lint/performance/noImgElement: The server authorizes this short-lived cover URL.
        <img src={coverPhotoUrl} alt={`Cover for ${memory.title}`} />
      ) : (
        <p role="status">No cover photo available.</p>
      )}
      {memory.description ? <p>{memory.description}</p> : null}
      {memory.location ? <p>{memory.location}</p> : null}
    </main>
  );
}
