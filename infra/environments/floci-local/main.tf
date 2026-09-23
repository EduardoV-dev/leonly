module "api" {
  source               = "../../modules/api"
  repository_name      = "leonly-api-local"
  image_tag_mutability = "MUTABLE"
  function_name        = "leonly-api-local"
}
