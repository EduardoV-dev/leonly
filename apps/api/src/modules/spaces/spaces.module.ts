import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { RateLimitModule } from "../../common/rate-limit/rate-limit.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { SpacesController } from "./controllers/spaces.controller";
import { InviteRegenerationService } from "./services/invite-regeneration.service";
import { SpacesService } from "./services/spaces.service";

@Module({
  imports: [AuthModule, RateLimitModule, MembershipsModule],
  controllers: [SpacesController],
  providers: [SpacesService, InviteRegenerationService],
  exports: [SpacesService],
})
export class SpacesModule {}
