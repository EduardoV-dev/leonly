import { Module } from "@nestjs/common";
import { SpacesModule } from "../spaces/spaces.module";
import { UsersController } from "./users.controller";

@Module({ imports: [SpacesModule], controllers: [UsersController] })
export class UsersModule {}
