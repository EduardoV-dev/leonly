import { z } from "zod";

/**
 * Strict save body for PATCH /api/memories/:memoryId. No edit idempotency key,
 * client storage paths, creator fields, or social fields are accepted.
 */
export const memoryEditSaveRequestSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().nullable(),
  location: z.string().nullable(),
  memoryDate: z.iso.date(),
  timezone: z.string().min(1),
  visibility: z.enum(["timeline", "vault"]),
  lastKnownUpdatedAt: z.iso.datetime({ offset: true }),
  retainedPhotoIds: z.array(z.uuid()),
  uploadIds: z.array(z.uuid()),
  coverFileId: z.uuid().nullable(),
});

export type MemoryEditSaveRequest = z.infer<typeof memoryEditSaveRequestSchema>;
