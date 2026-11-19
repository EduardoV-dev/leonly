terraform {
  backend "s3" {
    bucket       = "leonly-terraform-state-staging"
    key          = "bootstrap/staging.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
