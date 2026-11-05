import { Module } from "@nestjs/common";
import { StorageModule } from "../../common/storage/storage.module";
import { FilesModule } from "../files/files.module";
import { SpacesModule } from "../spaces/spaces.module";
import { MemoriesController } from "./memories.controller";
import { MemoriesService } from "./services/memories.service";
import { MemoryListService } from "./services/memory-list.service";

@Module({
  imports: [StorageModule, FilesModule, SpacesModule],
  controllers: [MemoriesController],
  providers: [MemoriesService, MemoryListService],
})
export class MemoriesModule {}
