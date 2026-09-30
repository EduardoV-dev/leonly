import { Global, Module } from "@nestjs/common";
import { Redis } from "@upstash/redis";
import { RedisService } from "./redis.service";
import { REDIS_CLIENT } from "./redis.tokens";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const url = process.env.UPSTASH_REDIS_REST_URL || "";
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
        const isConfigured = Boolean(url && token);
        if (!isConfigured) throw new Error("Redis URL and token are required.");
        return new Redis({ url, token });
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
