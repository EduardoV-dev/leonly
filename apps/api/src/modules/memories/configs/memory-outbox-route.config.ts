import { parseImageEvent } from "@leonly/utils/contracts";
import { ENVIRONMENT_VARIABLES } from "../../../common/configs/environment-variables.config";
import type { OutboxRoute } from "../../../common/outbox/outbox-publisher";
import { IMAGE_EVENT_TYPE } from "../constants/memories.constants";

export { IMAGE_EVENT_TYPE };

export function getMemoryOutboxRoute(): OutboxRoute {
  return {
    queueUrl: ENVIRONMENT_VARIABLES.SQS_QUEUES_URLS.memories || "",
    validate: parseImageEvent,
  };
}
