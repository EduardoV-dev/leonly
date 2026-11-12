import { Module } from "@nestjs/common";
import { StorageModule } from "../../common/storage/storage.module";
import { FilesModule } from "../files/files.module";
import { SpacesModule } from "../spaces/spaces.module";
import { MemoriesController } from "./controllers/memories.controller";
import { MemoryCommentsController } from "./controllers/memory-comments.controller";
import { MemoryReactionsController } from "./controllers/memory-reactions.controller";
import { MemoriesService } from "./services/memories.service";
import { MemoryCommentsService } from "./services/memory-comments.service";
import { MemoryDetailService } from "./services/memory-detail.service";
import { MemoryEditService } from "./services/memory-edit.service";
import { MemoryListService } from "./services/memory-list.service";
import { MemoryReactionsService } from "./services/memory-reactions.service";

@Module({
  imports: [StorageModule, FilesModule, SpacesModule],
  controllers: [MemoriesController, MemoryCommentsController, MemoryReactionsController],
  providers: [
    MemoriesService,
    MemoryListService,
    MemoryDetailService,
    MemoryEditService,
    MemoryReactionsService,
    MemoryCommentsService,
  ],
})
export class MemoriesModule {}
