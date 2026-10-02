module "api" {
  source                = "../../modules/api"
  repository_name       = "leonly-api-local"
  image_tag_mutability  = "MUTABLE"
  function_name         = "leonly-api-local"
  image_tag             = "handler-async"
  environment_variables = var.api_environment_variables
}
