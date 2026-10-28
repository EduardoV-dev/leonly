export {
  createSqsClient,
  SendMessageCommand,
  SQSClient,
  type SqsConfiguration,
  validateSqsUrl,
} from "./client";
export { parseSqsQueuesUrls } from "./parse-sqs-queues-urls";
export { publishMessage } from "./publisher";
