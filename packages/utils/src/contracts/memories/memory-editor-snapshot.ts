import { z } from "zod";

export const memoryEditorSnapshotPhotoSchema = z.strictObject({
  id: z.uuid(),
  previewUrl: z.string().nullable(),
});

export const memoryEditorSnapshotSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  location: z.string().nullable(),
  memoryDate: z.iso.date(),
  visibility: z.enum(["timeline", "vault"]),
  updatedAt: z.iso.datetime({ offset: true }),
  coverFileId: z.uuid().nullable(),
  photos: z.array(memoryEditorSnapshotPhotoSchema),
});

export type MemoryEditorSnapshotPhoto = z.infer<typeof memoryEditorSnapshotPhotoSchema>;
export type MemoryEditorSnapshot = z.infer<typeof memoryEditorSnapshotSchema>;
