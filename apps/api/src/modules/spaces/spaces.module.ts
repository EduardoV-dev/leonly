import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { RateLimitModule } from "../../common/rate-limit/rate-limit.module";
import { JoinAttemptRateLimiter } from "./join-attempt-rate-limiter";
import { SpacesController } from "./spaces.controller";
import { SpacesService } from "./spaces.service";

@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [SpacesController],
  providers: [SpacesService, JoinAttemptRateLimiter],
  exports: [SpacesService],
})
export class SpacesModule {}
