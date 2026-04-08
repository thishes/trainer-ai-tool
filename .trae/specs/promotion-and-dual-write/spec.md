# 宣推服务与双写备份功能规格

## Why
1. **数据安全需求**：需要实现 MySQL + JSON 双写备份机制，当 MySQL 服务异常时自动启用 JSON 备份，且恢复后自动同步数据
2. **业务扩展需求**：增加宣推服务模块，支持发布宣传文案和报名功能
3. **UI一致性需求**：所有页面遵循 Arco Design 设计规范，保持风格统一

## What Changes

### Part 1: 双写备份机制
- [ ] 在 db.js 中添加 MySQL 双写支持
- [ ] 当 MySQL 可用时，写操作同时写入 MySQL 和 JSON
- [ ] 当 MySQL 异常时，自动降级到 JSON 存储
- [ ] MySQL 恢复后，自动将 JSON 中的增量数据同步到 MySQL
- [ ] 数据库监测页面显示当前存储状态和同步状态

### Part 2: 宣推服务模块
- [ ] 新增一级菜单"宣推服务"
- [ ] 新增二级菜单"海报与报名"
- [ ] 管理员可创建、编辑、删除宣传文案
- [ ] 宣传文案支持富文本编辑器（复用公告编辑器）
- [ ] 可开关"报名"功能
- [ ] 用户端展示宣传页面，支持报名表单提交

### Part 3: UI 一致性优化
- [ ] 系统设置页面样式优化
- [ ] 新增页面遵循 Arco Design 规范
- [ ] 统一 Icon 风格（使用 @arco-design/web-vue-icons）
- [ ] 统一按钮、表单、表格样式

## Impact
- **Affected specs**: 双写备份、宣推服务、UI优化
- **Affected code**:
  - `server/db.js` - 双写逻辑和自动同步
  - `server/routes/` - 新增路由
  - `client/src/views/` - 新增页面及优化
  - `client/src/api/` - 新增API
  - `client/src/router/` - 路由配置

---

## ADDED Requirements

### Requirement: 双写备份机制
系统 SHALL 同时支持 MySQL 和 JSON 存储，写操作同时写入两个数据源

#### Scenario: MySQL 正常时
- **WHEN** 写操作执行时
- **THEN** 数据同时写入 MySQL 和 JSON

#### Scenario: MySQL 异常时
- **WHEN** MySQL 连接失败或超时
- **THEN** 自动降级到 JSON 存储
- **AND** 在数据库监测页面显示降级状态
- **AND** 记录降级开始时间

#### Scenario: MySQL 恢复时
- **WHEN** MySQL 重新连接成功
- **THEN** 自动将 JSON 中的增量数据同步到 MySQL
- **AND** 同步完成后更新同步状态

### Requirement: 自动数据同步
系统 SHALL 在 MySQL 恢复后自动同步 JSON 中的数据

#### Scenario: 增量同步
- **WHEN** MySQL 恢复连接
- **THEN** 遍历 JSON 数据，检查 MySQL 中是否存在
- **AND** 将不存在的记录插入 MySQL
- **AND** 将已存在但更新的记录更新到 MySQL

### Requirement: 宣推服务 - 宣传文案管理
管理员 SHALL 能够创建、编辑、删除宣传文案，且可锁定任意文案

#### Scenario: 创建宣传文案
- **WHEN** 管理员填写文案标题、内容，开启报名开关
- **AND** 点击保存
- **THEN** 文案保存成功并显示在列表

#### Scenario: 锁定文案
- **WHEN** 管理员点击锁定按钮
- **THEN** 文案被锁定，普通用户看不到该文案
- **AND** 列表中显示锁定标识

#### Scenario: 解锁文案
- **WHEN** 管理员点击解锁按钮
- **THEN** 文案被解锁，普通用户可见该文案

### Requirement: 普通用户权限
普通用户 SHALL 只能查看和编辑自己创建的宣传文案

#### Scenario: 查看文案列表
- **WHEN** 普通用户访问文案列表
- **THEN** 只显示自己创建的文案
- **AND** 不显示锁定/解锁功能

#### Scenario: 用户查看宣传页面
- **WHEN** 用户访问宣传页面
- **AND** 报名开关已开启
- **THEN** 显示报名按钮

### Requirement: 报名表单
已登录用户 SHALL 能够提交报名信息

#### Scenario: 提交报名
- **WHEN** 用户填写报名表单并提交
- **THEN** 报名信息保存成功

---

## MODIFIED Requirements

### Requirement: 数据库监测页面
数据库监测 SHALL 同时显示 MySQL 和 JSON 的状态信息

#### Scenario: MySQL 可用
- **THEN** 显示 MySQL 连接状态、记录数

#### Scenario: MySQL 不可用
- **THEN** 显示 JSON 备份状态

#### Scenario: 同步状态
- **THEN** 显示最后同步时间
- **AND** 显示待同步记录数（如有）

---

## REMOVED Requirements
无

---

## 宣推服务详细功能设计

### 2.0 权限设计

#### 2.0.1 角色划分
- **管理员（admin）**：可查看所有宣推内容，可锁定/解锁任意创建者的内容
- **普通用户（trainer）**：只能查看和编辑自己创建的内容

#### 2.0.2 权限规则
| 操作 | 管理员 | 创建者本人 | 其他用户 |
|------|--------|-----------|---------|
| 查看所有文案列表 | ✅ | ❌ | ❌ |
| 查看自己创建的文案 | ✅ | ✅ | ❌ |
| 创建文案 | ✅ | ✅ | ❌ |
| 编辑自己创建的文案 | ✅ | ✅ | ❌ |
| 删除自己创建的文案 | ✅ | ✅ | ❌ |
| 锁定/解锁任意文案 | ✅ | ❌ | ❌ |
| 查看报名记录 | ✅（全部） | ✅（自己的） | ❌ |

#### 2.0.3 锁定功能
- 管理员可锁定任意文案
- 被锁定的文案对普通用户不可见
- 管理员可随时解锁
- 文案列表中显示锁定状态标识

### 2.1 管理员功能

#### 2.1.1 文案列表页
- 表格展示所有宣传文案（不限创建者）
- 列：标题、状态、锁定状态、报名开关、创建者、创建时间、操作
- 支持搜索、筛选（按创建者、状态、锁定状态）
- 管理员显示锁定/解锁按钮

#### 2.1.2 创建/编辑文案
- **基本信息**
  - 标题（必填）
  - 状态（草稿/发布）
- **内容编辑**
  - 富文本编辑器（复用公告编辑器）
  - 支持图片上传
- **报名设置**
  - 开启/关闭报名开关
  - 报名表单字段配置（姓名、手机号等）
- **锁定设置**（仅管理员）
  - 锁定/解锁开关

#### 2.1.3 快捷功能键
- Ctrl+S: 保存
- Ctrl+P: 预览
- Ctrl+Shift+P: 切换发布状态

### 2.2 普通用户功能

#### 2.2.1 文案列表页
- 只显示自己创建的文案
- 不显示锁定/解锁功能
- 支持搜索、筛选

#### 2.2.2 创建/编辑文案
- 只能编辑自己创建的文案
- 无锁定设置

### 2.3 用户端功能

#### 2.3.1 宣传页面
- 展示已发布且未锁定的文案标题和内容
- 如果开启报名，显示报名按钮
- 被锁定的文案对用户不可见

#### 2.3.2 报名表单
- 表单字段：姓名、手机号、其他配置字段
- 提交后显示成功提示
- 防重复提交

### 2.4 数据模型

```
promotions
├── id (int, PK)
├── title (varchar) - 文案标题
├── content (text) - 文案内容（富文本）
├── enable_signup (boolean) - 是否开启报名
├── status (enum) - draft/published
├── locked (boolean) - 是否被管理员锁定
├── locked_by (int) - 锁定者ID
├── locked_at (timestamp) - 锁定时间
├── created_by (int) - 创建者ID
├── created_at (timestamp)
└── updated_at (timestamp)

signup_records
├── id (int, PK)
├── promotion_id (int, FK)
├── user_id (int) - 报名用户ID
├── name (varchar) - 姓名
├── phone (varchar) - 手机号
├── extra_data (json) - 其他字段
├── created_at (timestamp)
└── status (enum) - pending/confirmed
```

---

## 双写详细设计

### 写入流程
```
写操作 → 尝试写入 MySQL
         ↓ 成功
       写入 JSON
         ↓
       返回成功

写操作 → 尝试写入 MySQL
         ↓ 失败
       只写入 JSON
         ↓
       记录警告日志
         ↓
       标记降级模式
         ↓
       返回成功（降级模式）
```

### 自动同步流程（MySQL 恢复时）
```
MySQL 恢复连接
    ↓
检测降级模式
    ↓
读取 JSON 数据
    ↓
对比 MySQL 数据
    ↓
插入缺失记录
    ↓
更新差异记录
    ↓
更新同步状态
    ↓
完成同步
```

### 状态检测
- 启动时检测 MySQL 连接
- 每次写操作前检测连接状态
- 异常后每 30 秒重试
- 恢复后立即执行同步

### 同步标记
使用 JSON 文件中的 `lastSync` 字段记录最后同步时间，用于判断增量

---

## UI 一致性规范

### Arco Design 规范
- 使用 `@arco-design/web-vue-icons` 图标库
- 按钮使用 `<a-button>` 组件
- 表单使用 `<a-form>` 组件
- 表格使用 `<a-table>` 组件
- 卡片使用 `<a-card>` 组件
- 标签页使用 `<a-tabs>` / `<a-tab-pane>` 组件

### 页面布局规范
- 使用 `page-view` 类包裹页面
- 使用 `page-header-content` 展示页面标题
- 内容区域使用 `content-card` 卡片包裹
- 间距使用 16px / 24px 标准间距

### 颜色规范
- 主色：`rgb(var(--arcoblue-6))`
- 成功：`green-6`
- 警告：`orange-6`
- 危险：`red-6`
- 文字：主色 `#222222`，次要 `#666666`，禁用 `#999999`

### 动效规范
- 使用 `arco-design` 内置过渡动画
- 加载状态使用 `<a-spin>`
- 成功/失败反馈使用 `Message` 组件
