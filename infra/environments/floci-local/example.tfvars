memory_upload_bucket_name = "leonly-memory-photos-local"
image_queue_name          = "leonly-images-local"
frontend_origins          = ["http://localhost:3000"]

# The local deploy command updates this URI after a successful apply.
image_worker_local_image_uri = null
# Used only when the local image URI is null, for ECR deployment verification.
image_worker_image_digest = null
# Set false to pause SQS delivery without removing the worker.
image_processing_enabled = true

# Shared by local Lambda containers; use Compose hostnames for internal services.
environment_variables = {
  NODE_ENV                  = "production"
  BETTER_AUTH_SECRET        = "replace-me"
  BETTER_AUTH_COOKIE_DOMAIN = "localhost"
  GOOGLE_CLIENT_ID          = "replace-me"
  GOOGLE_CLIENT_SECRET      = "replace-me"
  DATABASE_URL              = "postgresql://leonly:leonly@postgres:5432/leonly?schema=public"
  UPSTASH_REDIS_REST_URL    = "http://redis-http:80"
  UPSTASH_REDIS_REST_TOKEN  = "local-redis-token"
  WEB_APP_ORIGIN            = "http://localhost:3000"
  STORAGE_ENDPOINT          = "http://floci:4566"
  STORAGE_SIGNING_ENDPOINT  = "http://localhost:4566"
  STORAGE_REGION            = "us-east-1"
  STORAGE_BUCKET            = "leonly-memory-photos-local"
  STORAGE_ACCESS_KEY_ID     = "test"
  STORAGE_SECRET_ACCESS_KEY = "test"
  SQS_ENDPOINT              = "http://floci:4566"
  SQS_QUEUES_URLS           = "{\"memories\":\"http://floci:4566/000000000000/leonly-images-local\"}"
}
