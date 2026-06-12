import type { SPACE_SETUP_STEPS } from "../constants/welcome-steps";

export type SpaceSetupSteps = (typeof SPACE_SETUP_STEPS)[keyof typeof SPACE_SETUP_STEPS];

export type SpaceSetupCreateSteps =
  | typeof SPACE_SETUP_STEPS.CREATE_START
  | typeof SPACE_SETUP_STEPS.CREATE_NAME
  | typeof SPACE_SETUP_STEPS.CREATE_DATE
  | typeof SPACE_SETUP_STEPS.CREATE_INVITE;

export type SpaceSetupJoinSteps =
  | typeof SPACE_SETUP_STEPS.JOIN_CODE
  | typeof SPACE_SETUP_STEPS.JOIN_NAME;
