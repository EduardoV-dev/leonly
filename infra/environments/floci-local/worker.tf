resource "aws_ecr_repository" "image_worker" {
  name = "leonly-image-worker-local"
}

resource "aws_cloudwatch_log_group" "image_worker" {
  name = "/aws/lambda/leonly-image-worker-local"
}

resource "aws_iam_role" "image_worker" {
  name = "leonly-image-worker-local-execution"

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
  name = "leonly-image-worker-local-processing"
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

resource "aws_lambda_function" "image_worker" {
  count                          = var.image_worker_image_digest == null && var.image_worker_local_image_uri == null ? 0 : 1
  function_name                  = "leonly-image-worker-local"
  role                           = aws_iam_role.image_worker.arn
  package_type                   = "Image"
  image_uri                      = var.image_worker_local_image_uri != null ? var.image_worker_local_image_uri : "${aws_ecr_repository.image_worker.repository_url}@${var.image_worker_image_digest}"
  architectures                  = ["x86_64"]
  memory_size                    = 1024
  timeout                        = 120
  reserved_concurrent_executions = 2

  environment {
    variables = var.environment_variables
  }

  depends_on = [aws_iam_role_policy.image_worker]
}

resource "aws_lambda_event_source_mapping" "images" {
  count                   = var.image_worker_image_digest == null && var.image_worker_local_image_uri == null ? 0 : 1
  event_source_arn        = module.image_queue.queue_arn
  function_name           = aws_lambda_function.image_worker[0].arn
  enabled                 = var.image_processing_enabled
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 2
  }
}
