import { parseImageEvent } from "@leonly/utils/contracts";
import { ENVIRONMENT_VARIABLES } from "../../common/config/environment-variables.config";
import type { OutboxRoute } from "../../common/outbox/outbox-publisher";

export function getMemoryOutboxRoute(): OutboxRoute {
  return {
    queueUrl: ENVIRONMENT_VARIABLES.SQS_QUEUES_URLS.memories || "",
    validate: parseImageEvent,
  };
}
