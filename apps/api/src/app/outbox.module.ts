import { Module } from "@nestjs/common";
import { ENVIRONMENT_VARIABLES } from "../common/configs/environment-variables.config";
import { ApiLoggerModule } from "../common/logger/logger.module";
import { registerOutbox } from "../common/outbox/outbox.module";
import {
  getMemoryOutboxRoute,
  IMAGE_EVENT_TYPE,
} from "../modules/memories/configs/memory-outbox-route.config";

@Module({
  imports: [
    ApiLoggerModule,
    registerOutbox({
      region: ENVIRONMENT_VARIABLES.AWS_REGION,
      endpoint: ENVIRONMENT_VARIABLES.SQS_ENDPOINT,
      routes: { [IMAGE_EVENT_TYPE]: getMemoryOutboxRoute() },
    }),
  ],
})
export class AppOutboxModule {}
