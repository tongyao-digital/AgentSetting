output "db_credentials_secret_arn" {
  description = "DB credentials secret ARN"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "app_secrets_secret_arn" {
  description = "App secrets secret ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "secrets_kms_key_arn" {
  description = "Secrets KMS key ARN"
  value       = aws_kms_key.secrets.arn
}