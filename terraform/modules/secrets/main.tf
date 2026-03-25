resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project}-${var.environment}-db-credentials"
  description = "Database credentials for ${var.project} ${var.environment}"
  tags = {
    Name = "${var.project}-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
  })
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.project}-${var.environment}-app-secrets"
  description = "Application secrets for ${var.project} ${var.environment}"
  tags = {
    Name = "${var.project}-${var.environment}-app-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id     = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode(var.app_secrets)
}

resource "aws_iam_policy" "ecs_secrets_policy" {
  name        = "${var.project}-${var.environment}-ecs-secrets-policy"
  description = "Policy for ECS tasks to access secrets"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Effect = "Allow"
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.app_secrets.arn
        ]
      },
      {
        Action = [
          "kms:Decrypt"
        ]
        Effect   = "Allow"
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}

resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager"
  deletion_window_in_days = 10
  enable_key_rotation     = true
  tags = {
    Name = "${var.project}-${var.environment}-secrets-kms"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project}-${var.environment}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_iam_role_policy_attachment" "ecs_secrets_policy_attachment" {
  role       = var.ecs_task_role_name
  policy_arn = aws_iam_policy.ecs_secrets_policy.arn
}