terraform {
  required_version = ">= 1.10.0"
  backend "s3" {
    bucket       = "leonly-terraform-state-staging"
    key          = "staging/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "cloudflare" {}

provider "aws" {
  region = var.aws_region
}

