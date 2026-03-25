# Runbook: 新注册Agent 3分钟内掉线

## 元信息
- **故障ID**: RB-2026-03-26-001
- **创建日期**: 2026-03-26
- **严重程度**: High
- **影响范围**: 新实例无法稳定提供服务
- **值班响应**: 15分钟内响应，30分钟内止血
- **最终修复**: Agent SDK增加heartbeat 404自动重注册逻辑

## 故障描述

### 现象
- 新注册的Agent在3分钟内出现连接中断
- 服务无法稳定提供，频繁掉线重连
- 仅影响新注册的Agent实例，已稳定运行的实例不受影响

### 关键日志
```
heartbeat 404 / instance_not_found
```

### 影响范围
- 新注册的Agent实例无法维持稳定连接
- 依赖这些Agent的服务请求失败
- 用户体验下降，服务可用性降低

## 根因分析

### 直接原因
Agent端复用了旧的`instance_id`，导致服务端无法识别新注册的实例。

### 根本原因
Agent SDK在重新注册时未正确清理旧的`instance_id`，导致：
1. Agent使用旧`instance_id`发送心跳
2. 服务端已删除该实例记录，返回404
3. Agent无法恢复，持续掉线

### 误判经验
1. **初期误判**: 曾怀疑是网络问题或服务端压力过大
   - 排查方向错误，浪费30分钟
   - 经验：遇到404错误应首先检查资源是否存在
   
2. **二次误判**: 认为是服务端Bug导致实例被误删
   - 检查服务端日志发现实例从未成功注册
   - 经验：`instance_not_found`可能意味着从未创建，而非被删除

## 排查步骤

### 第一步：确认故障现象
```bash
# 1. 检查Agent日志
grep -E "heartbeat.*(404|instance_not_found)" /var/log/agent/*.log

# 2. 确认掉线时间规律
grep -E "connection.*lost|reconnect" /var/log/agent/*.log | head -20

# 3. 检查是否仅影响新实例
# 对比新旧实例的连接状态
```

### 第二步：验证根因假设
```bash
# 1. 检查Agent使用的instance_id
grep -E "instance_id" /var/log/agent/*.log | tail -10

# 2. 检查服务端该instance_id是否存在
curl -s http://localhost:3000/api/instances/$INSTANCE_ID

# 3. 检查Agent启动日志，确认是否复用旧ID
grep -E "instance_id.*reuse|using.*existing" /var/log/agent/*.log
```

### 第三步：影响评估
```bash
# 1. 统计受影响的Agent数量
grep -l "heartbeat 404" /var/log/agent/*.log | wc -l

# 2. 检查服务可用性
curl -s http://localhost:3000/health | jq '.status'

# 3. 监控用户影响
# 查看相关业务指标
```

## 止血方案

### 立即止血（15分钟内）
1. **重启受影响的Agent**
   ```bash
   # 重启单个Agent
   systemctl restart happy-forest-agent
   
   # 批量重启所有Agent
   ansible all -m shell -a "systemctl restart happy-forest-agent"
   ```

2. **强制重新注册**
   ```bash
   # 清除旧的instance_id配置
   rm -f /etc/agent/instance_id
   
   # 重启Agent触发重新注册
   systemctl restart happy-forest-agent
   ```

### 验证止血效果
```bash
# 1. 检查Agent连接状态
systemctl status happy-forest-agent

# 2. 验证心跳正常
grep -E "heartbeat.*(200|success)" /var/log/agent/*.log | tail -5

# 3. 确认服务恢复
curl -s http://localhost:3000/health
```

### 止血后监控
- 持续监控30分钟，确认无再次掉线
- 检查业务指标是否恢复正常
- 准备详细故障报告

## 修复方案

### 短期修复（24小时内）
1. **Agent SDK增加心跳404自动重注册**
   ```javascript
   // 在心跳失败处理中添加
   async function handleHeartbeatError(error) {
     if (error.status === 404 && error.message.includes('instance_not_found')) {
       logger.warn('Instance not found, re-registering...');
       await this.register();
       return;
     }
     throw error;
   }
   ```

2. **添加instance_id有效性检查**
   ```javascript
   // 注册时验证instance_id
   async function validateInstanceId(instanceId) {
     try {
       await api.getInstance(instanceId);
       return true;
     } catch (error) {
       if (error.status === 404) {
         return false;
       }
       throw error;
     }
   }
   ```

### 长期修复（1周内）
1. **Agent生命周期管理优化**
   - 实现优雅停机，清理instance_id
   - 添加实例状态同步机制
   - 实现分布式锁防止重复注册

2. **监控告警增强**
   - 添加instance_id重复使用告警
   - 监控心跳404错误率
   - 添加Agent重注册频率告警

3. **文档更新**
   - 更新Agent部署文档
   - 添加故障排查手册
   - 记录最佳实践

## 升级条件

### 升级到二级响应（30分钟）
- 止血操作无效，Agent持续掉线
- 受影响Agent数量超过10%
- 用户投诉开始出现

### 升级到一级响应（60分钟）
- 止血操作失败，无法恢复服务
- 业务指标明显下降
- 影响核心业务功能

### 升级到紧急响应（90分钟）
- 服务完全不可用
- 数据丢失或损坏风险
- 需要全量回滚

## 预防措施

### 代码层面
1. **Agent SDK改进**
   - 心跳失败自动重试+重注册
   - instance_id有效性验证
   - 连接状态健康检查

2. **服务端改进**
   - 实例状态持久化
   - 心跳超时合理设置
   - 404错误详细日志

### 运维层面
1. **监控告警**
   - 新Agent注册成功率监控
   - 心跳404错误率告警
   - Agent重连频率监控

2. **部署规范**
   - Agent配置管理标准化
   - 部署前配置验证
   - 灰度发布策略

## 相关资源

### 文档链接
- [Agent部署指南](../learning/agent-deployment.md)
- [故障排查手册](../learning/troubleshooting.md)
- [SDK使用文档](../learning/sdk-usage.md)

### 联系人
- 二级响应：值班工程师
- 一级响应：技术负责人 + 运维负责人
- 紧急响应：CTO + 全体核心开发

### 工具命令
```bash
# Agent状态检查
systemctl status happy-forest-agent

# 日志查看
journalctl -u happy-forest-agent -f

# 实例信息查询
curl http://localhost:3000/api/instances

# 健康检查
curl http://localhost:3000/health
```

## 故障时间线
| 时间 | 事件 | 处理人 |
|------|------|--------|
| T+0 | 故障发生，新Agent开始掉线 | - |
| T+5 | 监控告警，值班工程师响应 | 值班工程师 |
| T+15 | 初步排查，怀疑网络问题 | 值班工程师 |
| T+30 | 发现404日志，确认根因 | 值班工程师 |
| T+45 | 执行止血方案，重启Agent | 值班工程师 |
| T+60 | 服务恢复，确认止血成功 | 值班工程师 |
| T+120 | 根因分析完成，制定修复方案 | 技术团队 |
| T+24 | 修复方案部署，问题彻底解决 | 开发团队 |

## 经验总结

### 做对了什么
1. 快速定位到404错误是关键线索
2. 止血方案简单有效，快速恢复服务
3. 及时记录故障过程，便于后续分析

### 需要改进
1. 初期排查方向错误，浪费时间
2. 监控告警不够及时，应提前发现
3. 文档不完善，排查过程依赖经验

### 改进措施
1. 完善监控告警，提前发现问题
2. 更新故障排查手册，减少误判
3. 定期演练，提升应急响应能力

## 附录

### 测试用例
```javascript
// 心跳404自动重注册测试
test('should re-register on heartbeat 404', async () => {
  const agent = new Agent();
  mockApi.heartbeat.mockRejectedValueOnce({ status: 404 });
  
  await agent.start();
  
  expect(mockApi.register).toHaveBeenCalled();
});
```

### 配置示例
```yaml
agent:
  heartbeat:
    interval: 30000
    timeout: 5000
    retry: 3
  registration:
    auto_reregister: true
    validate_before_use: true
```