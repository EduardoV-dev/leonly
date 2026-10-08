import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { AuthGuard } from "../auth/auth.guard";
import { AuthModule } from "../auth/auth.module";
import { ApiExceptionFilter } from "../common/http/api-exception.filter";
import { ApiResponseInterceptor } from "../common/http/api-response.interceptor";
import { apiValidationPipe } from "../common/http/api-validation.pipe";
import { ApiLoggerModule } from "../common/logger/logger.module";
import { PrismaModule } from "../common/prisma/prisma.module";
import { RateLimitGuard } from "../common/rate-limit/rate-limit.guard";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";
import { HealthModule } from "../health/health.module";
import { MembershipsModule } from "../modules/memberships/memberships.module";
import { SettingsModule } from "../modules/settings/settings.module";
import { SpacesModule } from "../modules/spaces/spaces.module";
import { UsersModule } from "../modules/users/users.module";

@Module({
  imports: [
    ApiLoggerModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    RateLimitModule,
    SpacesModule,
    MembershipsModule,
    UsersModule,
    SettingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: RateLimitGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_PIPE, useValue: apiValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
