output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.ecs.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.rds_endpoint
}

output "prometheus_workspace_endpoint" {
  description = "Prometheus workspace endpoint"
  value       = module.monitoring.prometheus_workspace_endpoint
}