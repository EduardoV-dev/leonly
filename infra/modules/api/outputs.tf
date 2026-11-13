output "api_endpoint" {
  description = "Base URL for the API Gateway HTTP API."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "execution_role_name" {
  description = "API Lambda execution role for application-specific permissions."
  value       = aws_iam_role.lambda_execution.name
}
