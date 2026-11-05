import { Module } from "@nestjs/common";
import { StorageModule } from "../../common/storage/storage.module";
import { FilesModule } from "../files/files.module";
import { MemoriesController } from "./memories.controller";
import { MemoriesService } from "./services/memories.service";

@Module({
  imports: [StorageModule, FilesModule],
  controllers: [MemoriesController],
  providers: [MemoriesService],
})
export class MemoriesModule {}
