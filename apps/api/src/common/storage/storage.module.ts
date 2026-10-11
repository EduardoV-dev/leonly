import { ObjectStorage } from "@leonly/utils/storage";
import { Module } from "@nestjs/common";
import { ENVIRONMENT_VARIABLES } from "../config/environment-variables.config";

@Module({
  providers: [
    {
      provide: ObjectStorage,
      useFactory: () =>
        new ObjectStorage({
          endpoint: ENVIRONMENT_VARIABLES.STORAGE_ENDPOINT,
          signingEndpoint: ENVIRONMENT_VARIABLES.STORAGE_SIGNING_ENDPOINT || undefined,
          region: ENVIRONMENT_VARIABLES.STORAGE_REGION,
          bucket: ENVIRONMENT_VARIABLES.STORAGE_BUCKET,
          accessKeyId: ENVIRONMENT_VARIABLES.STORAGE_ACCESS_KEY_ID,
          secretAccessKey: ENVIRONMENT_VARIABLES.STORAGE_SECRET_ACCESS_KEY,
        }),
    },
  ],
  exports: [ObjectStorage],
})
export class StorageModule {}
