output "ecr_repository_urls" {
  description = "Staging registry destinations keyed by workload."
  value       = { for workload, repository in aws_ecr_repository.app : workload => repository.repository_url }
}
