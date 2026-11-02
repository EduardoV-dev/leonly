import { Module } from "@nestjs/common";
import { StorageModule } from "../../common/storage/storage.module";
import { MemoriesController } from "./memories.controller";
import { MemoriesService } from "./services/memories.service";
import { UploadFinalizationService } from "./services/upload-finalization.service";

@Module({
  imports: [StorageModule],
  controllers: [MemoriesController],
  providers: [MemoriesService, UploadFinalizationService],
})
export class MemoriesModule {}
