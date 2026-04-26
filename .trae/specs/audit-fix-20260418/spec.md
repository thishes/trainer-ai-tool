# 系统审计修复与优化 Spec（增强版）

## Why
基于 2026-04-18 的全面系统审计，发现多个关键 Bug 和架构性问题需要系统性修复。本次修复将解决：
- **6处致命/高优先级 Bug**：Array vs Map 反复出现、status 数组查询错误、计分字段缺失等
- **3个架构性改进**：数据模型统一、数据校验层、API 返回类型规范化
- **性能优化**：减少 N+1 查询、优化数据库索引、前端渲染性能
- **安全加固**：输入验证、SQL 注入防护、XSS 防护、权限边界检查
- **健壮性提升**：异常处理、降级机制、日志完善

## What Changes

### 🔧 Bug 修复（必须）
- 修复所有 Array vs Map bug（共6处）
- status 查询 IN 子句支持
- result 接口开放访问（可选认证）
- time_limit 默认值处理
- ISO 8601 时间格式转换

### 📊 科学计分算法（必须）
- 客观题/主观题分离计分
- 新增4个数据库字段
- 支持纯客观题自动批改和混合试卷待评状态

### ⚡ 性能优化（新增）
- **数据库层面**
  - 为 exam_records 表的 (paper_id, status) 创建复合索引
  - 为 paper_questions 表的 paper_id 创建索引
  - 批量查询替代循环单条查询（已部分实现）
- **API 层面**
  - Stats 接口添加缓存机制（短时缓存，5-10秒）
  - 减少 unnecessary 的数据库查询
- **前端层面**
  - 虚拟滚动支持大量排名数据
  - 防抖/节流统计面板刷新请求

### 🔒 安全性增强（新增）
- **输入验证**
  - 所有 API 参数进行类型和范围校验
  - examId 参数防止 SQL 注入（使用参数化查询）
  - answers 数据大小限制（防 DoS）
- **输出过滤**
  - 敏感信息不返回给未授权用户
  - 错误信息脱敏（生产环境隐藏堆栈）
- **权限边界**
  - 确认每个接口的最小权限原则
  - 防止越权访问他人成绩

### 💪 健壮性提升（新增）
- **异常处理**
  - 所有 async 操作添加 try-catch
  - 数据库连接失败时的重试机制
  - 外部服务调用超时处理
- **降级机制**
  - WebSocket 断开时降级为轮询
  - 统计数据加载失败时显示友好提示
- **日志完善**
  - 关键操作记录审计日志
  - 性能慢查询日志
  - 错误追踪上下文信息

### Breaking Changes
- **数据库 schema 变更**：exam_records 表新增4个字段 + 索引
- **API 返回格式变更**：submit/result 增加分离计分字段

## Impact
- Affected specs: 无依赖其他 spec
- Affected code:
  - `server/routes/exam.js` - 核心修改（评分、查询、权限）
  - `server/db-mysql.js` - 数据库操作（IN子句、索引建议）
  - `server/repository.js` - 方法注册
  - `server/middleware/schemas.js` - 输入验证增强
  - `client/src/views/Exam.vue` - 前端考试页面
  - `client/src/views/ExamResult.vue` - 结果展示
  - `client/src/components/ExamStatsPanel.vue` - 统计面板
  - Database: exam_records 表结构变更 + 索引

---

## ADDED Requirements

### Requirement: 科学计分算法
同原 spec（详见上方 What Changes）

### Requirement: API 返回类型规范化
同原 spec（Array→Map 统一处理模式）

### Requirement: 仪表盘实时统计
同原 spec（Stats 正确显示 + WebSocket 刷新）

### Requirement: 性能优化（新增）

#### Scenario: 数据库查询性能
- **WHEN** Stats 接口查询大量考试记录
- **THEN** 使用复合索引 (paper_id, status)，响应时间 < 200ms

#### Scenario: 批量操作优化
- **WHEN** 提交试卷需要查询多道题目
- **THEN** 使用批量查询（IN）替代循环单条查询

#### Scenario: 前端渲染性能
- **WHEN** 排名列表超过100条
- **THEN** 使用虚拟滚动或分页，保持流畅

### Requirement: 安全性增强（新增）

#### Scenario: 输入验证
- **WHEN** 用户提交任意参数到 API
- **THEN** 系统进行类型、范围、格式验证，拒绝非法输入

#### Scenario: 权限隔离
- **WHEN** 用户A尝试查看用户B的成绩
- **THEN** 系统拒绝访问（除非是管理员或公开考试）

#### Scenario: 错误信息脱敏
- **WHEN** 发生服务器内部错误
- **THEN** 生产环境返回通用错误消息，开发环境返回详细堆栈

### Requirement: 健壮性提升（新增）

#### Scenario: 数据库连接恢复
- **WHEN** 数据库连接意外断开
- **THEN** 系统自动重连并重试操作（最多3次）

#### Scenario: WebSocket 降级
- **WHEN** Socket.IO 连接断开
- **THEN** 前端自动切换为轮询模式（每10秒）

#### Scenario: 审计日志
- **WHEN** 发生关键操作（登录、交卷、评分）
- **THEN** 系统记录操作日志（时间、用户、IP、操作内容）

---

## MODIFIED Requirements
同原 spec

---

## REMOVED Requirements
无

---

## 技术实现细节

### 1. 数据库 Schema 变更 + 索引

```sql
-- 新增字段
ALTER TABLE exam_records ADD COLUMN objective_score INT DEFAULT NULL AFTER percentage;
ALTER TABLE exam_records ADD COLUMN objective_total INT DEFAULT NULL AFTER objective_score;
ALTER TABLE exam_records ADD COLUMN subjective_score INT DEFAULT NULL AFTER objective_total;
ALTER TABLE exam_records ADD COLUMN subjective_total INT DEFAULT NULL AFTER subjective_score;

-- 性能优化：复合索引
CREATE INDEX idx_exam_records_paper_status ON exam_records(paper_id, status);
CREATE INDEX idx_paper_questions_paper_id ON paper_questions(paper_id);
```

### 2. Array vs Map 统一处理模式（6处）

```javascript
// 标准模式
const questionsList = await repo.getQuestionsByIds(questionIds);
const questionsMap = {};
for (const q of questionsList) {
  questionsMap[q.id] = q;
}
```

### 3. Status IN 子句支持

```javascript
if (Array.isArray(status)) {
  sql += ` AND status IN (${status.map(() => '?').join(', ')})`;
  params.push(...status);
} else if (status) {
  sql += ' AND status = ?';
  params.push(status);
}
```

### 4. 输入验证增强示例

```javascript
// schemas.js 增强
examSubmit: Joi.object({
  exam_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  answers: Joi.object().max(50), // 限制答案数量防DoS
}).options({ stripUnknown: true }) // 移除未知字段
```

### 5. 错误处理增强示例

```javascript
try {
  const result = await riskyOperation();
  return resp.success(res, result);
} catch (e) {
  logger.error('操作失败', { error: e.message, context: { id: req.params.id } });
  
  if (process.env.NODE_ENV === 'production') {
    return resp.error(res, '操作失败，请稍后重试');
  }
  throw e; // 开发环境暴露详细错误
}
```

### 6. 统计缓存策略（伪代码）

```javascript
// 内存缓存（简单实现，可后续升级为 Redis）
const statsCache = new Map();
const CACHE_TTL = 10000; // 10秒

async function getStatsWithCache(paperId) {
  const cacheKey = `stats:${paperId}`;
  const cached = statsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await computeStats(paperId);
  statsCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```
