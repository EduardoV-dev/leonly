import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { RedisModule } from "../redis/redis.module";
import { RateLimitGuard } from "./rate-limit.guard";
import { RateLimitService } from "./rate-limit.service";

@Module({
  imports: [RedisModule, AuthModule],
  providers: [RateLimitService, RateLimitGuard],
  exports: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule {}
