variable "name" {
  description = "Name of the standard image-processing queue; the DLQ adds -dlq."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_-]{1,76}$", var.name))
    error_message = "name must contain 1–76 letters, digits, underscores, or hyphens."
  }
}
