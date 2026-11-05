import { ObjectStorage } from "@leonly/utils/storage";
import { ENVIRONMENT_VARIABLES } from "../constants/environment-variables";

export const storage = new ObjectStorage({
  endpoint: ENVIRONMENT_VARIABLES.STORAGE_ENDPOINT,
  region: ENVIRONMENT_VARIABLES.STORAGE_REGION,
  bucket: ENVIRONMENT_VARIABLES.STORAGE_BUCKET,
  accessKeyId: ENVIRONMENT_VARIABLES.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: ENVIRONMENT_VARIABLES.STORAGE_SECRET_ACCESS_KEY,
});
