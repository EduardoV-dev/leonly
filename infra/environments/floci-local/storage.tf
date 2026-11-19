resource "aws_s3_bucket" "files" {
  bucket = var.storage_bucket_name
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  cors_rule {
    id              = "memory-image-upload"
    allowed_methods = ["PUT"]
    allowed_origins = var.frontend_origins
    allowed_headers = ["content-type", "if-none-match"]
  }
}
