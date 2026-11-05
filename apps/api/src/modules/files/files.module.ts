import { Module } from "@nestjs/common";
import { StorageModule } from "../../common/storage/storage.module";
import { SpacesModule } from "../spaces/spaces.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [StorageModule, SpacesModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
