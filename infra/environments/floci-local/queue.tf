module "image_queue" {
  source = "../../modules/image-queue"
  name   = var.image_queue_name
}

resource "aws_iam_role_policy" "image_publication" {
  name = "leonly-api-local-image-publication"
  role = module.api.execution_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = module.image_queue.queue_arn
    }]
  })
}
