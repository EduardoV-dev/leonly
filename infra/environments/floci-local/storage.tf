resource "aws_s3_bucket" "memory_uploads" {
  bucket = var.memory_upload_bucket_name
}

resource "aws_s3_bucket_public_access_block" "memory_uploads" {
  bucket                  = aws_s3_bucket.memory_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "memory_uploads" {
  bucket = aws_s3_bucket.memory_uploads.id

  cors_rule {
    id              = "memory-image-upload"
    allowed_methods = ["PUT"]
    allowed_origins = var.frontend_origins
    allowed_headers = ["content-type"]
  }
}
