import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { MembershipsController } from "./controllers/memberships.controller";
import { MembershipsService } from "./services/memberships.service";

@Module({
  imports: [AuthModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
