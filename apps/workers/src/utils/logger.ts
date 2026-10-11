import { createLoggerOptions } from "@leonly/utils/logger";
import pino from "pino";
import { ENVIRONMENT_VARIABLES } from "../constants/environment-variables";

export const logger = pino(createLoggerOptions(ENVIRONMENT_VARIABLES.NODE_ENV));
