export const MAX_IMAGE_COUNT = 10;
export const MAX_IMAGE_BYTES = 5_242_880;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const ATTACHMENT_SECONDS = 4_200;
export const FINALIZATION_LEASE_SECONDS = 120;

export const IMAGE_EXTENSIONS = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const;
