locals {
  staging_region       = "us-east-1"
  github_repository    = "EduardoV-dev/leonly"
  github_oidc_host     = "token.actions.githubusercontent.com"
  github_oidc_audience = "sts.amazonaws.com"

  staging_deployments = {
    infra = { role_name = "leonly-deploy-infra-staging", environment = "infra-staging" }
    app   = { role_name = "leonly-deploy-app-staging", environment = "app-staging" }
  }
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://${local.github_oidc_host}"
  client_id_list = [local.github_oidc_audience]

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role" "deploy" {
  for_each = local.staging_deployments

  name = each.value.role_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "${local.github_oidc_host}:aud" = local.github_oidc_audience
          "${local.github_oidc_host}:sub" = "repo:${local.github_repository}:environment:${each.value.environment}"
        }
      }
    }]
  })
}
