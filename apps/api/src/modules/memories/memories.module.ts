import { Module } from "@nestjs/common";
import { StorageModule } from "../../common/storage/storage.module";
import { UploadFinalizationService } from "../files/upload-finalization.service";
import { MemoriesController } from "./memories.controller";
import { MemoriesService } from "./memories.service";

@Module({
  imports: [StorageModule],
  controllers: [MemoriesController],
  providers: [MemoriesService, UploadFinalizationService],
})
export class MemoriesModule {}
