output "memory_upload_bucket_name" {
  description = "Private R2 bucket for API and worker storage configuration."
  value       = cloudflare_r2_bucket.memory_uploads.name
}

output "memory_storage_endpoint" {
  description = "Account-scoped R2 S3 API endpoint; use storage region auto."
  value       = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
}

output "image_queue_url" {
  description = "SQS queue URL for API publication and image processing."
  value       = module.image_queue.queue_url
}

output "image_dead_letter_queue_url" {
  description = "SQS DLQ for image-processing failure evidence."
  value       = module.image_queue.dead_letter_queue_url
}

output "image_worker_repository_url" {
  description = "ECR repository for the Node.js 24 worker image."
  value       = aws_ecr_repository.image_worker.repository_url
}

output "image_worker_function_name" {
  value = aws_lambda_function.image_worker.function_name
}

output "image_event_source_mapping_id" {
  description = "Event-source mapping identifier for operations and rollback."
  value       = aws_lambda_event_source_mapping.images.uuid
}
