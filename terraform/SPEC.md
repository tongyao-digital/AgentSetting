# Terraform AWS 部署草稿

## 1. 目录结构

```
terraform/
├── modules/
│   ├── vpc/                 # VPC网络模块
│   ├── ecs/                 # ECS Fargate计算模块
│   ├── rds/                 # RDS PostgreSQL数据模块
│   ├── monitoring/          # Prometheus+CloudWatch监控模块
│   └── secrets/             # Secrets Manager密钥模块
├── environments/
│   ├── test/                # 测试环境配置
│   └── prod/                # 生产环境配置
└── README.md               # 本文件
```

## 2. 模块拆分

### 2.1 VPC模块 (`modules/vpc`)
- 创建VPC、公私子网
- 配置Internet Gateway和NAT Gateway
- 路由表配置
- 生产环境多AZ部署

### 2.2 ECS模块 (`modules/ecs`)
- ECS Fargate集群
- 任务定义和服务配置
- ALB负载均衡器
- 安全组配置
- 自动伸缩策略
- 滚动发布支持

### 2.3 RDS模块 (`modules/rds`)
- PostgreSQL RDS实例
- 子网组和参数组
- KMS加密
- 备份策略
- 安全组（仅允许ECS访问）

### 2.4 监控模块 (`modules/monitoring`)
- Amazon Managed Service for Prometheus
- CloudWatch日志组
- CloudWatch仪表板
- 告警配置

### 2.5 密钥模块 (`modules/secrets`)
- Secrets Manager密钥
- KMS加密密钥
- IAM策略（ECS任务访问权限）

## 3. 关键变量说明

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `aws_region` | string | us-east-1 | AWS区域 |
| `project` | string | happy-forest | 项目名称 |
| `environment` | string | test/prod | 环境名称 |
| `vpc_cidr` | string | 10.0.0.0/16 | VPC CIDR块 |
| `public_subnet_cidrs` | list(string) | [10.0.1.0/24, 10.0.2.0/24] | 公有子网CIDR |
| `private_subnet_cidrs` | list(string) | [10.0.10.0/24, 10.0.20.0/24] | 私有子网CIDR |
| `container_image` | string | nginx:latest | 容器镜像 |
| `task_cpu` | number | 256/512 | 任务CPU单位 |
| `task_memory` | number | 512/1024 | 任务内存(MiB) |
| `desired_count` | number | 1/2 | 期望任务数 |
| `db_instance_class` | string | db.t3.micro/db.t3.small | RDS实例类型 |
| `db_allocated_storage` | number | 20 | 初始存储(GB) |
| `db_max_allocated_storage` | number | 50/100 | 最大存储(GB) |
| `db_username` | string | - | 数据库用户名(敏感) |
| `db_password` | string | - | 数据库密码(敏感) |
| `backup_retention_period` | number | 7/30 | 备份保留天数 |
| `log_retention_days` | number | 30 | 日志保留天数 |
| `app_secrets` | map(string) | {} | 应用密钥(敏感) |

## 4. 环境差异矩阵 (15项)

| 序号 | 配置项 | Test环境 | Prod环境 | 说明 |
|------|--------|----------|----------|------|
| 1 | VPC CIDR | 10.0.0.0/16 | 10.0.0.0/16 | 相同CIDR块，通过不同账户隔离 |
| 2 | 子网数量 | 2公+2私 | 2公+2私 | 相同子网架构 |
| 3 | NAT Gateway | 无 | 1个 | Prod环境私有子网出网需求 |
| 4 | ECS任务CPU | 256 | 512 | Prod环境更高计算资源 |
| 5 | ECS任务内存 | 512 MiB | 1024 MiB | Prod环境更大内存 |
| 6 | ECS期望任务数 | 1 | 2 | Prod环境高可用 |
| 7 | ECS最大任务数 | 10 | 10 | 相同最大伸缩限制 |
| 8 | RDS实例类型 | db.t3.micro | db.t3.small | Prod环境更强数据库 |
| 9 | RDS最大存储 | 50 GB | 100 GB | Prod环境更大存储上限 |
| 10 | RDS多AZ | 禁用 | 启用 | Prod环境高可用 |
| 11 | RDS备份保留 | 7天 | 30天 | Prod环境更长备份保留 |
| 12 | RDS删除保护 | 禁用 | 启用 | Prod环境防止误删 |
| 13 | RDS公网访问 | 禁用 | 禁用 | 两者均禁止公网访问 |
| 14 | 日志保留期 | 30天 | 30天 | 相同日志保留策略 |
| 15 | 告警动作 | 无 | SNS主题 | Prod环境需要告警通知 |

## 5. 安全风险清单

### 5.1 网络安全
1. **公有子网暴露风险**：ALB在公有子网，需确保安全组仅开放80/443端口
2. **私有子网隔离**：RDS和ECS任务在私有子网，无直接公网访问
3. **NAT Gateway单点**：Prod环境NAT Gateway为单点，可考虑多AZ部署

### 5.2 数据安全
4. **RDS加密**：已启用KMS加密，确保静态数据安全
5. **备份安全**：Prod环境30天备份保留，需定期测试恢复
6. **数据库凭证**：通过Secrets Manager管理，避免硬编码

### 5.3 计算安全
7. **容器镜像安全**：需扫描容器镜像漏洞，建议使用ECR镜像扫描
8. **任务权限最小化**：ECS任务角色应遵循最小权限原则
9. **滚动发布风险**：部署失败时自动回滚，但需监控部署状态

### 5.4 监控安全
10. **日志完整性**：CloudWatch日志需确保不被篡改
11. **告警响应**：Prod环境需配置告警接收人，确保及时响应
12. **指标采集**：Prometheus指标可能暴露敏感信息，需限制访问

### 5.5 密钥管理
13. **密钥轮换**：KMS密钥已启用自动轮换，但需验证轮换策略
14. **访问控制**：ECS任务访问Secrets Manager需最小权限
15. **密钥泄露**：避免在日志中输出密钥值，需配置日志过滤

### 5.6 合规性
16. **访问日志**：需启用VPC流日志和ALB访问日志
17. **变更审计**：所有变更需通过Terraform执行，确保可追溯
18. **环境隔离**：test/prod使用不同账户或VPC，确保完全隔离