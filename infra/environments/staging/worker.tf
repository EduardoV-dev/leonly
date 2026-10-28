data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

resource "aws_ecr_repository" "image_worker" {
  name = var.image_worker_name
}

resource "aws_ecr_repository_policy" "image_worker" {
  repository = aws_ecr_repository.image_worker.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
      Condition = {
        ArnLike = {
          "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.image_worker_name}"
        }
      }
    }]
  })
}

resource "aws_cloudwatch_log_group" "image_worker" {
  name = "/aws/lambda/${var.image_worker_name}"
}

resource "aws_iam_role" "image_worker" {
  name = "${var.image_worker_name}-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "image_worker" {
  name = "${var.image_worker_name}-processing"
  role = aws_iam_role.image_worker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = module.image_queue.queue_arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.image_worker.arn}:*"
      },
    ]
  })
}

resource "aws_iam_role_policy" "image_publication" {
  name = "${var.image_worker_name}-publication"
  role = var.api_execution_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = module.image_queue.queue_arn
    }]
  })
}

resource "aws_lambda_function" "image_worker" {
  function_name                  = var.image_worker_name
  role                           = aws_iam_role.image_worker.arn
  package_type                   = "Image"
  image_uri                      = "${aws_ecr_repository.image_worker.repository_url}@${var.image_worker_image_digest}"
  architectures                  = ["x86_64"]
  memory_size                    = 1024
  timeout                        = 120
  reserved_concurrent_executions = 2

  environment {
    variables = merge(var.worker_environment_variables, {
      NODE_ENV         = "production"
      STORAGE_ENDPOINT = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
      STORAGE_REGION   = "auto"
      STORAGE_BUCKET   = cloudflare_r2_bucket.memory_uploads.name
    })
  }

  depends_on = [aws_iam_role_policy.image_worker, aws_ecr_repository_policy.image_worker]
}

resource "aws_lambda_event_source_mapping" "images" {
  event_source_arn        = module.image_queue.queue_arn
  function_name           = aws_lambda_function.image_worker.arn
  enabled                 = var.image_processing_enabled
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 2
  }
}
