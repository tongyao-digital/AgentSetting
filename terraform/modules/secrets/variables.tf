variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name (test/prod)"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "app"
}

variable "app_secrets" {
  description = "Application secrets"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "ecs_task_role_name" {
  description = "ECS task role name"
  type        = string
}