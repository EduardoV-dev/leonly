import { type DynamicModule, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  OUTBOX_CONFIGURATION,
  type OutboxConfiguration,
  OutboxPublisher,
} from "./outbox-publisher";

@Module({})
export class OutboxModule {}

export function registerOutbox(configuration: OutboxConfiguration): DynamicModule {
  return {
    module: OutboxModule,
    global: true,
    imports: [PrismaModule],
    providers: [{ provide: OUTBOX_CONFIGURATION, useValue: configuration }, OutboxPublisher],
    exports: [OutboxPublisher],
  };
}
