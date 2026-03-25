# AgentSetting CLI 清单与命令规范

## 1. 目标
为本项目统一封装以下能力（本次范围）：
1. 环境自检（doctor）
2. 本地开发启停（dev up/down）
3. 数据库操作入口（db migrate/seed/reset）
4. 测试入口（test unit/integration/all）
5. 契约校验（contract check）
6. 质量检查（lint/typecheck）

## 2. CLI 清单
| 一级命令 | 二级命令 | 说明 |
|---|---|---|
| `doctor` | - | 检查 Node/npm、目录结构、端口、docker compose 状态 |
| `dev` | `up` | 启动开发环境（web dev + 可选 docker compose） |
| `dev` | `down` | 关闭开发环境（停止 `agentctl` 启动的进程 + 可选 compose down） |
| `db` | `migrate` | 数据库迁移入口 |
| `db` | `seed` | 数据库种子数据入口 |
| `db` | `reset` | 数据库重置入口 |
| `test` | `unit` | 运行单元测试集合 |
| `test` | `integration` | 运行集成测试集合 |
| `test` | `all` | 顺序执行 `unit + integration` |
| `contract` | `check` | 校验前端 API 契约与后端错误码/筛选参数一致性 |
| `lint` | - | 执行 lint；若未配置 lint 脚本则回退到契约校验 |
| `typecheck` | - | 执行 TypeScript 类型检查 |

## 3. 命令规范

### 3.1 通用规则
1. 入口：`node scripts/agentctl.mjs <command>`。
2. 根目录脚本别名：可用 `npm run <script>` 执行（见第 5 节）。
3. 默认在仓库根目录执行。
4. 返回码：
   - `0`：成功
   - `1`：执行失败/校验失败/参数错误
   - `2`：当前能力未就绪（例如 DB 层未接入）

### 3.2 doctor
命令：
```bash
node scripts/agentctl.mjs doctor
```
检查项：
1. Node 版本（>=18）
2. npm 可用性
3. 关键目录存在性（`apps/web`、`apps/server`、`docs`）
4. docker compose 配置与 docker 命令状态
5. 本地端口探测：`127.0.0.1:3306`、`127.0.0.1:6379`

### 3.3 dev up/down
命令：
```bash
node scripts/agentctl.mjs dev up
node scripts/agentctl.mjs dev down
```
行为约束：
1. `dev up`：
   - 若 `docker-compose.yml` 有服务定义且本机有 docker，则执行 `docker compose up -d`。
   - 启动 `apps/web` 的 `npm run dev`（后台进程）。
   - 启动信息和 pid 写入 `.agentctl/dev-state.json`。
   - 日志落盘 `.agentctl/logs/*.log`。
2. `dev down`：
   - 停止 `.agentctl/dev-state.json` 中登记的后台进程。
   - 若 compose 可用，执行 `docker compose down`。

### 3.4 db migrate/seed/reset
命令：
```bash
node scripts/agentctl.mjs db migrate
node scripts/agentctl.mjs db seed
node scripts/agentctl.mjs db reset
```
当前状态说明：
1. 本项目服务端 DB 层仍为占位目录（`apps/server/src/db/.gitkeep`）。
2. 以上命令已统一封装入口，但当前会返回 `2` 并提示“DB 未接入”。
3. 后续接入 MySQL 后，仅需在该入口内落地真实迁移/seed/reset 执行器，无需改调用方。

### 3.5 test unit/integration/all
命令：
```bash
node scripts/agentctl.mjs test unit
node scripts/agentctl.mjs test integration
node scripts/agentctl.mjs test all
```
约定：
1. `unit`：执行前端单元测试集合
   - `tests/api-client.spec.ts`
   - `tests/capability-form.spec.ts`
   - `tests/capability-utils.spec.ts`
2. `integration`：执行前端集成测试集合 + 服务端 `.spec.js` 集成测试
3. `all`：先 `unit`，后 `integration`，任一步失败即退出

### 3.6 contract check
命令：
```bash
node scripts/agentctl.mjs contract check
```
校验内容：
1. `apps/web/src/types/api-contract.ts` 中 `ApiCode` 与 `API_HTTP_STATUS_BY_CODE` 映射是否完整一致。
2. 服务端 `apps/server/src/app.js` 使用的业务码是否都在前端契约中声明。
3. 能力列表筛选参数是否仅使用 `keyword` 与 `capability_type`。

### 3.7 lint/typecheck
命令：
```bash
node scripts/agentctl.mjs lint
node scripts/agentctl.mjs typecheck
```
规则：
1. `lint`：
   - 若 `apps/web` 或 `apps/server` 存在 `lint` 脚本，则执行对应脚本。
   - 若不存在，回退执行 `contract check`。
2. `typecheck`：
   - 对存在 `tsconfig.json` 的应用执行 `tsc --noEmit`。

## 4. 典型使用顺序
```bash
npm run doctor
npm run dev:up
npm run contract:check
npm run test:all
npm run typecheck
npm run dev:down
```

## 5. package.json 脚本映射
```json
{
  "agentctl": "node ./scripts/agentctl.mjs",
  "doctor": "node ./scripts/agentctl.mjs doctor",
  "dev:up": "node ./scripts/agentctl.mjs dev up",
  "dev:down": "node ./scripts/agentctl.mjs dev down",
  "db:migrate": "node ./scripts/agentctl.mjs db migrate",
  "db:seed": "node ./scripts/agentctl.mjs db seed",
  "db:reset": "node ./scripts/agentctl.mjs db reset",
  "test:unit": "node ./scripts/agentctl.mjs test unit",
  "test:integration": "node ./scripts/agentctl.mjs test integration",
  "test:all": "node ./scripts/agentctl.mjs test all",
  "contract:check": "node ./scripts/agentctl.mjs contract check",
  "lint": "node ./scripts/agentctl.mjs lint",
  "typecheck": "node ./scripts/agentctl.mjs typecheck"
}
```
