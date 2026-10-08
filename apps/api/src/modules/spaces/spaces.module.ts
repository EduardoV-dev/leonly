import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { SpacesController } from "./controllers/spaces.controller";
import { InviteRegenerationService } from "./services/invite-regeneration.service";
import { SpacesService } from "./services/spaces.service";

@Module({
  imports: [AuthModule, MembershipsModule],
  controllers: [SpacesController],
  providers: [SpacesService, InviteRegenerationService],
  exports: [SpacesService],
})
export class SpacesModule {}
