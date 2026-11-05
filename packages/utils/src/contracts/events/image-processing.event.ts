import { type ImageEvent, imageProcessingEventSchema } from "./image-processing.schema";

export {
  IMAGE_VARIANT_NAMES,
  type ImageEvent,
  type ImageVariantName,
  imageProcessingEventSchema,
} from "./image-processing.schema";

export class ImageEventError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export function parseImageEvent(value: unknown): ImageEvent {
  const result = imageProcessingEventSchema.safeParse(value);
  if (!result.success) throw new ImageEventError("INVALID_EVENT");

  return result.data;
}
