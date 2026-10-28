variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the private upload bucket."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.cloudflare_account_id))
    error_message = "cloudflare_account_id must be a 32-character hexadecimal account ID."
  }
}

variable "aws_region" {
  description = "AWS region for the image-processing queue and Lambda."
  type        = string
}

variable "image_queue_name" {
  description = "Name of the standard staging image queue."
  type        = string
}

variable "image_worker_name" {
  description = "Name of the image Lambda and its container repository."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,53}$", var.image_worker_name))
    error_message = "image_worker_name must contain 2–54 lowercase letters, digits, or hyphens."
  }
}

variable "image_worker_image_digest" {
  description = "Digest of the built worker image pushed to its ECR repository."
  type        = string

  validation {
    condition     = can(regex("^sha256:[0-9a-f]{64}$", var.image_worker_image_digest))
    error_message = "image_worker_image_digest must be a sha256 image digest."
  }
}

variable "worker_environment_variables" {
  description = "Private worker configuration supplied through an ignored tfvars file."
  type        = map(string)
  sensitive   = true

  validation {
    condition = alltrue([
      for key in ["DATABASE_URL", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"] :
      try(trimspace(var.worker_environment_variables[key]) != "", false)
    ])
    error_message = "Worker database URL and bucket-scoped storage credentials are required."
  }
}

variable "api_execution_role_name" {
  description = "Existing staging API role that publishes committed image events."
  type        = string
}

variable "image_processing_enabled" {
  description = "Explicit switch for the staging SQS event-source mapping."
  type        = bool
}

variable "memory_upload_bucket_name" {
  description = "Name of the private memory upload bucket."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.memory_upload_bucket_name))
    error_message = "memory_upload_bucket_name must contain 3–63 lowercase letters, digits, or hyphens."
  }
}

variable "frontend_origins" {
  description = "Explicit HTTPS frontend origins permitted to upload staging images."
  type        = list(string)

  validation {
    condition = length(var.frontend_origins) > 0 && alltrue([
      for origin in var.frontend_origins : can(regex("^https://[A-Za-z0-9.-]+(:[0-9]+)?$", origin))
    ])
    error_message = "frontend_origins must contain HTTPS origins without paths or wildcards."
  }
}
