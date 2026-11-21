locals {
  repository_names = {
    api          = "leonly-api-staging"
    image_worker = "leonly-image-worker-staging"
  }
}

resource "aws_ecr_repository" "app" {
  for_each = local.repository_names

  name                 = each.value
  image_tag_mutability = "IMMUTABLE"

  lifecycle {
    prevent_destroy = true
  }
}
