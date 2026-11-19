locals {
  state_bucket_arn  = "arn:aws:s3:::leonly-terraform-state-staging"
  staging_state_key = "staging/terraform.tfstate"
  staging_lock_key  = "${local.staging_state_key}.tflock"

  staging_repository_names = ["leonly-api-staging", "leonly-image-worker-staging"]
  staging_function_names   = ["leonly-staging-api", "leonly-staging-image-worker"]

  release_alias      = "live"
  regional_arn       = "${local.staging_region}:${data.aws_caller_identity.current.account_id}"
  repository_arns    = [for name in local.staging_repository_names : "arn:aws:ecr:${local.regional_arn}:repository/${name}"]
  function_arns      = [for name in local.staging_function_names : "arn:aws:lambda:${local.regional_arn}:function:${name}"]
  release_alias_arns = [for arn in local.function_arns : "${arn}:${local.release_alias}"]
}

resource "aws_iam_role_policy" "staging_state" {
  name = "leonly-staging-terraform-state"
  role = aws_iam_role.deploy["infra"].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3 needs bucket list access to return 404 when the first state object does not exist yet.
        Sid      = "ListStateBucketKeys"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = local.state_bucket_arn
      },
      {
        Sid      = "ReadWriteStagingState"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${local.state_bucket_arn}/${local.staging_state_key}"
      },
      {
        Sid      = "ManageStagingLock"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${local.state_bucket_arn}/${local.staging_lock_key}"
      }
    ]
  })
}

resource "aws_iam_role_policy" "staging_ecr" {
  name = "leonly-staging-terraform-ecr"
  role = aws_iam_role.deploy["infra"].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ManageStagingRepositories"
      Effect = "Allow"
      Action = [
        "ecr:CreateRepository",
        "ecr:DescribeRepositories",
        "ecr:ListTagsForResource",
        "ecr:PutImageTagMutability"
      ]
      Resource = local.repository_arns
    }]
  })
}

resource "aws_iam_role_policy" "app_release" {
  name = "leonly-staging-app-release"
  role = aws_iam_role.deploy["app"].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AuthenticateToEcr"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "PushAndResolveStagingImages"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeImages",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = local.repository_arns
      },
      {
        Sid      = "PublishStagingFunctions"
        Effect   = "Allow"
        Action   = ["lambda:GetFunctionConfiguration", "lambda:PublishVersion", "lambda:UpdateFunctionCode"]
        Resource = local.function_arns
      },
      {
        Sid      = "PromoteStagingAliases"
        Effect   = "Allow"
        Action   = ["lambda:GetAlias", "lambda:UpdateAlias"]
        Resource = local.release_alias_arns
      }
    ]
  })
}
