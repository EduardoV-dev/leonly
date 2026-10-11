import { Module } from "@nestjs/common";
import { ENVIRONMENT_VARIABLES } from "../common/config/environment-variables.config";
import { ApiLoggerModule } from "../common/logger/logger.module";
import { registerOutbox } from "../common/outbox/outbox.module";
import { getMemoryOutboxRoute } from "../modules/memories/memory-outbox-route";

@Module({
  imports: [
    ApiLoggerModule,
    registerOutbox({
      region: ENVIRONMENT_VARIABLES.AWS_REGION,
      endpoint: ENVIRONMENT_VARIABLES.SQS_ENDPOINT,
      routes: { ImageVariantsRequested: getMemoryOutboxRoute() },
    }),
  ],
})
export class AppOutboxModule {}
