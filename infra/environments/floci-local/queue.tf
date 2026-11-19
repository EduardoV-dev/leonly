resource "aws_sqs_queue" "dead_letter" {
  name                    = "${var.image_queue_name}-dlq"
  sqs_managed_sse_enabled = true
}

resource "aws_sqs_queue" "images" {
  name                       = var.image_queue_name
  visibility_timeout_seconds = 720
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dead_letter.arn
    maxReceiveCount     = 5
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "dead_letter" {
  queue_url = aws_sqs_queue.dead_letter.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.images.arn]
  })
}

resource "aws_iam_role_policy" "image_publication" {
  name = "leonly-api-local-image-publication"
  role = aws_iam_role.api.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.images.arn
    }]
  })
}
