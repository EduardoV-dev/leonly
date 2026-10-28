cloudflare_account_id     = "REPLACE_WITH_CLOUDFLARE_ACCOUNT_ID"
memory_upload_bucket_name = "REPLACE_WITH_PRIVATE_R2_BUCKET"
frontend_origins          = ["https://REPLACE_WITH_FRONTEND_HOST"]
aws_region                = "REPLACE_WITH_AWS_REGION"
image_queue_name          = "REPLACE_WITH_IMAGE_QUEUE_NAME"
image_worker_name         = "REPLACE_WITH_WORKER_NAME"
image_worker_image_digest = "sha256:REPLACE_WITH_PUSHED_IMAGE_DIGEST"
api_execution_role_name   = "REPLACE_WITH_EXISTING_API_ROLE"
image_processing_enabled  = false

worker_environment_variables = {
  DATABASE_URL              = "REPLACE_WITH_WORKER_DATABASE_URL"
  STORAGE_ACCESS_KEY_ID     = "REPLACE_WITH_BUCKET_SCOPED_ACCESS_KEY"
  STORAGE_SECRET_ACCESS_KEY = "REPLACE_WITH_BUCKET_SCOPED_SECRET_KEY"
}
