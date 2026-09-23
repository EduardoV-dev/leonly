output "api_endpoint" {
  description = "Base URL for the API Gateway HTTP API."
  value       = aws_apigatewayv2_api.api.api_endpoint
}
