# 能力管理技术方案验收标准（可自动化）

## 1. 验收条目

| AC-ID | 验收项 | 自动化方式 | 通过标准 |
|---|---|---|---|
| AC-GEN-001 | 统一响应结构 | API契约测试 | 所有接口响应包含 `code/message/request_id`，成功响应含 `data` |
| AC-GEN-002 | 业务数值参数为 `number-string` | API参数化测试 | `id/page/page_size/sort/version/category_id` 含非数字字符时返回 `CAP_4001` |
| AC-GEN-003 | 分页边界校验 | API测试 | `page<1` 或 `page_size>100` 返回 `CAP_4001` |
| AC-CAT-001 | 新增分类成功 | API+DB集成测试 | `POST /categories` 返回成功，DB存在记录 |
| AC-CAT-002 | 分类名唯一（归一化） | API测试 | 忽略大小写+空格后重名，返回 `CAP_4002` |
| AC-CAT-003 | 删除非空分类拦截 | API+DB测试 | 分类下有能力时删除返回 `CAP_4005` |
| AC-CAT-004 | 内置分类不可删 | API测试 | 删除 `is_builtin=1` 分类返回 `CAP_4001` |
| AC-CAT-005 | 分类并发更新冲突 | 并发API测试 | 旧 `version` 更新返回 `CAP_4091` |
| AC-CAP-001 | 仅允许新增外部类型能力 | API测试 | 新增 `WX_APP/WX_FLOW` 返回 `CAP_4001` |
| AC-CAP-002 | 能力名称分类内唯一 | API+DB测试 | 同分类重名返回 `CAP_4002` |
| AC-CAP-003 | 同步能力只读 | API测试 | `source=sync` 的能力编辑/删除返回 `CAP_4004` |
| AC-CAP-004 | 能力软删除 | API+DB测试 | 删除后 `is_deleted=1`，默认列表不可见 |
| AC-CAP-005 | 能力筛选参数范围 | API测试 | 列表仅支持 `keyword` 和 `capability_type`，筛选结果准确 |
| AC-CAP-006 | 改类型清空请求配置 | API+DB测试 | 修改 `capability_type` 后 `request_config` 被清空 |
| AC-HTTP-001 | URL协议校验 | API测试 | 非 `http/https` 返回 `CAP_4006` |
| AC-HTTP-002 | 内网/回环地址拦截 | API测试 | `localhost/127.0.0.1/10.x/172.16-31.x/192.168.x` 返回 `CAP_4006` |
| AC-HTTP-003 | 超时范围校验 | API测试 | 超时字段不在 `1000-60000` 返回 `CAP_4001` |
| AC-HTTP-004 | Header黑名单 | API测试 | 包含 `Host/Content-Length` 返回 `CAP_4001` |
| AC-HTTP-005 | 大响应体处理 | 集成测试（Mock上游） | 上游返回 >2MB 时返回 `CAP_5001` |
| AC-SYNC-001 | 增量同步写入 | 任务集成测试 | 增量任务可 upsert 能力，`sync_jobs` 记录成功统计 |
| AC-SYNC-002 | 全量校准可执行 | 任务集成测试 | 全量任务执行成功并落 `sync_jobs` 记录 |
| AC-SYNC-003 | 同步失败重试策略 | 任务测试（故障注入） | 失败后最多重试3次，间隔满足 `1s/2s/4s` |
| AC-SYNC-004 | 部分失败状态 | 任务测试 | 部分失败时任务状态为 `partial` 且有 `error_summary` |
| AC-SYNC-005 | 手动触发同步接口 | API+任务测试 | `POST /sync-jobs/trigger` 可触发任务并可在 `/sync-jobs` 查询 |
| AC-OBS-001 | 链路完整性（User->API->Service->Repository->DB） | 集成测试+Trace校验 | 每次成功请求至少产生 4 段span：API、Service、Repository、DB |
| AC-OBS-002 | 错误链路可观测 | 故障注入测试 | 发生业务/DB错误时日志包含 `request_id`、错误码、耗时 |
| AC-PERF-001 | 列表性能 | k6/JMeter 自动化压测 | 10,000条数据下，`GET /capabilities` P95 < 500ms |
| AC-REL-001 | 回归门禁 | CI流水线 | P0自动化用例通过率 100%，否则禁止发布 |

## 2. 自动化执行门禁
1. API层：契约测试 + 参数化测试 + 并发测试。
2. 集成层：TestContainers（MySQL/Redis）+ Mock问学平台。
3. 任务层：定时任务与手动触发都纳入 CI。
4. 可观测层：自动校验 trace span 名称与层级。
5. 性能层：每日/每次发布前执行基线压测并生成报告。
