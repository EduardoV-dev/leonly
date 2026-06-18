import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import type { SpaceSetupSteps } from "../../types/setup-types";

export const INVITE_CODE = "LEO-LOVE-2024";

export const screenImages: Record<
  SpaceSetupSteps,
  {
    image: string;
  }
> = {
  [SPACE_SETUP_STEPS.CREATE_START]: {
    image:
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=82",
  },
  [SPACE_SETUP_STEPS.CREATE_NAME]: {
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=82",
  },
  [SPACE_SETUP_STEPS.CREATE_DATE]: {
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82",
  },
  [SPACE_SETUP_STEPS.CREATE_INVITE]: {
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=82",
  },
  [SPACE_SETUP_STEPS.JOIN_CODE]: {
    image:
      "https://images.unsplash.com/photo-1501901609772-df0848060b33?auto=format&fit=crop&w=1200&q=82",
  },
  [SPACE_SETUP_STEPS.JOIN_NAME]: {
    image:
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=82",
  },
};
