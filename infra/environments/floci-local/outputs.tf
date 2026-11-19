output "api_endpoint" {
  description = "Base URL for the local API Gateway HTTP API."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "storage_bucket_name" {
  description = "Local Floci S3 bucket for API and worker storage configuration."
  value       = aws_s3_bucket.files.id
}

output "memory_storage_endpoint" {
  description = "Browser-reachable local S3 endpoint; use storage region us-east-1."
  value       = "http://localhost:4566"
}

output "image_queue_url" {
  description = "Floci SQS URL for API publication and local image processing."
  value       = aws_sqs_queue.images.id
}

output "image_dead_letter_queue_url" {
  description = "Floci SQS DLQ for local failure inspection."
  value       = aws_sqs_queue.dead_letter.id
}

output "workers_repository_url" {
  description = "Local ECR repository for publishing the worker image before Lambda creation."
  value       = aws_ecr_repository.workers.repository_url
}

output "image_worker_function_name" {
  description = "Deployed local image Lambda, or null before the image digest is supplied."
  value       = try(aws_lambda_function.image_worker[0].function_name, null)
}
