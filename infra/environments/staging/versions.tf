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
    neon = {
      source  = "neondatabase/neon"
      version = "0.19.0-beta.0"
    }
  }
}

provider "cloudflare" {}

provider "neon" {}

provider "aws" {
  region = var.aws_region
}
