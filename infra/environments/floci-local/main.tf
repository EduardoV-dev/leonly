module "api" {
  source                = "../../modules/api"
  repository_name       = "leonly-api-local"
  image_tag_mutability  = "MUTABLE"
  function_name         = "leonly-api-local"
  image_tag             = var.api_image_tag
  environment_variables = var.environment_variables
}
