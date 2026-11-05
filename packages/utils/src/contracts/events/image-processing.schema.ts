import { z } from "zod";

export const IMAGE_VARIANT_NAMES = ["cover", "detail"] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidSchema = z.string().regex(UUID_PATTERN);
const imageVariantSchema = z.enum(IMAGE_VARIANT_NAMES);

export const imageProcessingEventSchema = z.object({
  id: uuidSchema,
  entityType: z.literal("file"),
  entityId: uuidSchema,
  eventType: z.literal("ImageVariantsRequested"),
  createdAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Invalid event timestamp",
  }),
  payload: z.object({
    memoryId: uuidSchema,
    spaceId: uuidSchema,
    variantNames: z
      .array(imageVariantSchema)
      .min(1)
      .refine((names) => new Set(names).size === names.length, {
        message: "Duplicate image variants",
      }),
  }),
});

export type ImageVariantName = z.infer<typeof imageVariantSchema>;
export type ImageEvent = z.infer<typeof imageProcessingEventSchema>;
