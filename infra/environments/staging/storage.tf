resource "cloudflare_r2_bucket" "memory_uploads" {
  account_id = var.cloudflare_account_id
  name       = var.memory_upload_bucket_name
}

resource "cloudflare_r2_managed_domain" "memory_uploads" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.memory_uploads.name
  enabled     = false
}

resource "cloudflare_r2_bucket_cors" "memory_uploads" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.memory_uploads.name

  rules = [{
    id = "memory-image-upload"
    allowed = {
      methods = ["PUT"]
      origins = var.frontend_origins
      headers = ["content-type"]
    }
  }]
}
