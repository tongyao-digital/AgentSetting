terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "happy-forest/test/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"
  
  project     = var.project
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = var.availability_zones
}

module "ecs" {
  source = "../../modules/ecs"
  
  project     = var.project
  environment = var.environment
  
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  
  container_image = var.container_image
  task_cpu        = var.task_cpu
  task_memory     = var.task_memory
  desired_count   = var.desired_count
  
  environment_variables = var.environment_variables
  secret_variables      = var.secret_variables
  
  aws_region         = var.aws_region
  log_retention_days = var.log_retention_days
}

module "rds" {
  source = "../../modules/rds"
  
  project     = var.project
  environment = var.environment
  
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  ecs_security_group_id = module.ecs.ecs_tasks_security_group_id
  
  db_instance_class     = var.db_instance_class
  db_allocated_storage  = var.db_allocated_storage
  db_max_allocated_storage = var.db_max_allocated_storage
  db_name               = var.db_name
  db_username           = var.db_username
  db_password           = var.db_password
  backup_retention_period = var.backup_retention_period
}

module "secrets" {
  source = "../../modules/secrets"
  
  project     = var.project
  environment = var.environment
  
  db_username = var.db_username
  db_password = var.db_password
  db_host     = module.rds.rds_endpoint
  db_port     = module.rds.rds_port
  db_name     = var.db_name
  app_secrets = var.app_secrets
  
  ecs_task_role_name = module.ecs.ecs_task_role_name
}

module "monitoring" {
  source = "../../modules/monitoring"
  
  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
  
  ecs_cluster_name = module.ecs.ecs_cluster_id
  ecs_service_name = module.ecs.ecs_service_name
  alb_name_suffix  = module.ecs.alb_name_suffix
  
  log_retention_days = var.log_retention_days
  alarm_actions      = var.alarm_actions
}