import { Global, Module } from "@nestjs/common";
import { Redis } from "@upstash/redis";
import { ENVIRONMENT_VARIABLES } from "../config/environment-variables.config";
import { RedisService } from "./redis.service";
import { REDIS_CLIENT } from "./redis.tokens";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } =
          ENVIRONMENT_VARIABLES;
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
