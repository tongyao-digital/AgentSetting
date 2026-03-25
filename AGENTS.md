# AGENTS.md

## 1. 文档目的
本文件定义本仓库的统一技术规范与执行边界，供开发者与 AI Agent 协作使用。

规范来源（优先级从高到低）：
1. `docs/TECH_SPEC.md`（主规范）
2. `docs/learning/ability-management-prd-supplement.md`
3. `docs/learning/ability-management-techspec-acceptance.md`
4. `CLAUDE.md`

若文档冲突，以 `docs/TECH_SPEC.md` 为准。

## 2. 当前项目范围
仅包含能力管理板块（前后端分离）：
1. 分类管理
2. 能力管理
3. 外部 HTTP 能力配置
4. 同步任务（增量/全量）

不在范围内：
1. 智能体管理板块
2. 前台智能体上线/下线流程
3. 服务内 RBAC 校验（认证沿用网关登录态）

## 3. 技术栈
1. 前端：React + TypeScript
2. 前端 UI：Ant Design（默认组件库）
3. 后端：Node.js + TypeScript
4. 数据与基础设施：MySQL、Redis
5. 工程形态：Monorepo

## 4. Monorepo 目录基线
```text
AgentSetting/
  docs/
    TECH_SPEC.md
    learning/
  apps/
    web/
    server/
  packages/
    shared-types/
    shared-utils/
  .github/workflows/
  docker/
  docker-compose.yml
  scripts/
  CLAUDE.md
  AGENTS.md
```

## 5. 架构与调用链
请求链路必须满足：
`User -> API Controller -> Service -> Repository -> Database`

同步链路必须满足：
`Scheduler -> Sync Worker -> Upstream API -> Ability Service -> Database`

## 6. 核心业务硬约束
1. `number-string` 规则
   - 业务数值参数必须为字符串数字。
   - 正则：`^[0-9]+$`。
   - 允许前导零。
2. 删除幂等
   - 重复删除统一返回成功码 `0`。
3. 同步触发互斥
   - 手动触发同步时，不允许并发运行多个任务。
4. 同步能力只读
   - `source=sync` 的能力不可编辑/删除。
5. 能力类型变更
   - 修改 `capability_type` 必须清空 `request_config`。

## 7. API 规范
1. Base Path：`/api/v1/ability-management`
2. 关键接口：
   - `GET/POST /categories`
   - `PUT/DELETE /categories/{id}`
   - `GET/POST /capabilities`
   - `GET/PUT/DELETE /capabilities/{id}`
   - `GET /sync-jobs`
   - `POST /sync-jobs/trigger`
3. 能力列表筛选仅允许：`keyword`、`capability_type`
4. 统一响应结构：
   - 成功：`{ code: "0", message: "ok", data, request_id }`
   - 失败：`{ code: "CAP_xxxx", message, request_id }`

## 8. 错误码与 HTTP 状态映射
1. `0` -> 200
2. `CAP_4001` -> 400
3. `CAP_4002` -> 409
4. `CAP_4003` -> 404
5. `CAP_4004` -> 409
6. `CAP_4005` -> 409
7. `CAP_4006` -> 400
8. `CAP_4091` -> 409
9. `CAP_5001` -> 502（外部依赖异常）
10. `CAP_5002` -> 500（同步任务异常）

## 9. 数据模型约束（必须落地）
1. 唯一约束：分类归一化名、能力归一化名、同步键
2. 外键约束：
   - `capabilities.category_id -> categories.id`
   - `capability_http_configs.capability_id -> capabilities.id`
3. 外键策略：`ON UPDATE CASCADE`、`ON DELETE RESTRICT`
4. 核心字段必须 `NOT NULL`

## 10. 前端实现规范（Ant Design）
1. 默认复用 antd 组件，避免引入第二套 UI 库。
2. 典型组件约定：
   - 列表：`Table` + `Pagination`
   - 表单：`Form` + `Input` + `Select` + `InputNumber`
   - 弹层：`Modal` + `Drawer`
   - 上传：`Upload`
3. 新增 UI 库前必须先更新 `docs/TECH_SPEC.md` 并评审。

## 11. 测试与质量门禁
1. API 契约测试：响应结构、状态码、错误码一致。
2. 参数化测试：`number-string`、超时、URL 安全策略。
3. 并发测试：`version` 冲突返回 `CAP_4091`。
4. 同步测试：增量/全量/重试/partial 场景覆盖。
5. 性能基线：10,000 条数据下，列表接口 `P95 < 500ms`。

## 12. 变更管理规则
1. 行为变更先改 `docs/TECH_SPEC.md`，再改代码。
2. 同步更新 `docs/learning/*` 中验收与测试文档。
3. 不允许在代码中引入未文档化行为。
4. 对接口、DB 约束、错误码的修改必须同时更新自动化用例。

## 13. Agent 执行规则
1. 修改前先确认是否违反第 6 节硬约束。
2. 生成代码时优先复用现有模块与共享类型。
3. 任何新增接口都必须补：请求字段、错误码、HTTP 状态、测试点。
4. 提交结果说明中必须包含：改动范围、影响面、验证方式。
