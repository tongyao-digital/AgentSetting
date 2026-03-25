output "prometheus_workspace_id" {
  description = "Prometheus workspace ID"
  value       = aws_prometheus_workspace.main.id
}

output "prometheus_workspace_endpoint" {
  description = "Prometheus workspace endpoint"
  value       = aws_prometheus_workspace.main.prometheus_endpoint
}