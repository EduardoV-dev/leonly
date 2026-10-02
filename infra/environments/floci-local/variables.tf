variable "api_environment_variables" {
  description = "Environment variables configured on the local API Lambda."
  type        = map(string)
  sensitive   = true
  default     = {}
}
