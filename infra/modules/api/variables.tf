variable "repository_name" {
  type = string
}

variable "image_tag_mutability" {
  type = string

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutability must be MUTABLE or IMMUTABLE"
  }
}

variable "function_name" {
  type = string
}