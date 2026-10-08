import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { MembershipsController } from "./controllers/memberships.controller";
import { SpacesController } from "./controllers/spaces.controller";
import { InviteRegenerationService } from "./services/invite-regeneration.service";
import { MembershipsService } from "./services/memberships.service";
import { SpacesService } from "./services/spaces.service";

@Module({
  imports: [AuthModule],
  controllers: [SpacesController, MembershipsController],
  providers: [SpacesService, InviteRegenerationService, MembershipsService],
  exports: [SpacesService],
})
export class SpacesModule {}
