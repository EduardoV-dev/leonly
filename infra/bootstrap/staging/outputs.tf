output "staging_infra_role_arn" {
  description = "AWS OIDC role for the staging infrastructure workflow."
  value       = aws_iam_role.deploy["infra"].arn
}

output "staging_app_role_arn" {
  description = "AWS OIDC role for the staging application workflow."
  value       = aws_iam_role.deploy["app"].arn
}
