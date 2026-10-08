import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { RateLimitModule } from "../../common/rate-limit/rate-limit.module";
import { MembershipsController } from "./controllers/memberships.controller";
import { JoinAttemptRateLimiter } from "./services/join-attempt-rate-limiter";
import { MembershipsService } from "./services/memberships.service";

@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, JoinAttemptRateLimiter],
  exports: [MembershipsService],
})
export class MembershipsModule {}
