resource "neon_project" "staging" {
  name                      = "leonly-staging"
  org_id                    = var.neon_organization_id
  pg_version                = 18
  region_id                 = "aws-us-east-1"
  history_retention_seconds = 21600

  primary_compute = {
    autoscaling_limit_min_cu = 0.25
    autoscaling_limit_max_cu = 1
  }

  lifecycle {
    prevent_destroy = true
  }
}
