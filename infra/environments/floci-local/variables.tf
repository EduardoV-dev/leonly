variable "environment_variables" {
  description = "Shared environment variables configured on local Lambda functions."
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "image_queue_name" {
  description = "Name of the standard local Floci image queue."
  type        = string
}

variable "image_worker_image_digest" {
  description = "Pushed worker SHA-256 digest; null provisions only the repository for bootstrap."
  type        = string
  default     = null

  validation {
    condition     = var.image_worker_image_digest == null ? true : can(regex("^sha256:[0-9a-f]{64}$", var.image_worker_image_digest))
    error_message = "image_worker_image_digest must be null or a SHA-256 image digest."
  }
}

variable "image_worker_local_image_uri" {
  description = "Locally built Docker image reference; takes precedence over the ECR digest in Floci only."
  type        = string
  default     = null

  validation {
    condition     = var.image_worker_local_image_uri == null ? true : can(regex("^000000000000\\.dkr\\.ecr\\.us-east-1\\.amazonaws\\.com/leonly-image-worker-local:dev-[a-z0-9-]+$", var.image_worker_local_image_uri))
    error_message = "image_worker_local_image_uri must be a local worker image with a unique dev tag."
  }
}

variable "image_processing_enabled" {
  description = "Enable automatic SQS delivery to the deployed local image Lambda."
  type        = bool
  default     = true
}

variable "memory_upload_bucket_name" {
  description = "Name of the local Floci S3 memory upload bucket."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.memory_upload_bucket_name))
    error_message = "memory_upload_bucket_name must contain 3–63 lowercase letters, digits, or hyphens."
  }
}

variable "frontend_origins" {
  description = "Explicit local frontend origins permitted to upload staging images."
  type        = list(string)

  validation {
    condition = length(var.frontend_origins) > 0 && alltrue([
      for origin in var.frontend_origins : can(regex("^https?://[A-Za-z0-9.-]+(:[0-9]+)?$", origin))
    ])
    error_message = "frontend_origins must contain HTTP(S) origins without paths or wildcards."
  }
}
