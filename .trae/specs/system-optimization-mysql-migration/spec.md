# 系统优化与MySQL迁移 Spec

## Why
当前系统存在以下问题需要优化：
1. API管理分散，缺乏统一管理机制
2. 数据存储使用本地JSON文件，无法满足高可用要求
3. 远程MySQL服务器连接不稳定，需要健壮性优化
4. 缺乏管理员系统设置功能，无法直观了解系统运行状态
5. 需要建立成熟的API集中管理机制提升可维护性
6. 缺乏CI/CD流程，无法实现自动化构建和在线升级

## What Changes

### 1. API集中管理机制
- 创建统一的API服务层（apiService.js）
- 建立请求拦截器和响应处理机制
- 实现错误处理和重试机制（指数退避）
- 添加请求缓存优化性能

### 2. MySQL迁移与优化
- 优化MySQL连接池配置
- 实现连接重试和故障转移机制
- 完善数据库初始化和数据校验
- 确保数据一致性

### 3. 系统健壮性优化
- 添加全局错误处理中间件
- 实现请求超时控制
- 添加日志和监控机制
- 完善异常恢复机制

### 4. 管理员系统设置模块（新增）
- **平台升级**：版本检测、远程升级功能
- **服务器信息**：系统环境、端口、运行时长
- **运行指标**：CPU、内存、网络连接数
- **数据统计**：用户数、题目数、试卷数、考试记录数
- **系统日志**：操作日志、错误日志查看

### 5. CI/CD自动化流程（新增）
- GitHub Actions 自动构建和发布
- 从GitHub Release下载并安装更新
- 升级前自动备份，失败自动回滚
- 管理员点击即可实现在线升级

## Impact

### Affected Specs
- 用户认证系统
- 题目管理
- 试卷管理
- 考试记录管理
- 公告管理
- 管理员系统设置（新增）
- CI/CD自动化（新增）

### Affected Code
- client/src/api/ - 新建API服务层（含重试机制）
- client/src/views/SystemSettings.vue - 新建系统设置页面
- server/db.js - 数据库层（JSON模式）
- server/db-mysql.js - MySQL连接层（已就绪）
- server/routes/* - 路由适配
- server/middleware/errorHandler.js - 全局错误处理
- server/routes/system.js - 系统管理路由
- server/scripts/update-script.js - 在线更新脚本
- .github/workflows/ci-cd.yml - CI/CD工作流

## ADDED Requirements

### Requirement: 系统设置页面
系统 SHALL 提供管理员系统设置页面，包含以下功能模块：

#### Scenario: 查看系统信息
- **WHEN** 管理员访问系统设置页面
- **THEN** 显示服务器环境信息（Node.js版本、操作系统、端口、运行时长）

#### Scenario: 查看运行指标
- **WHEN** 管理员查看运行指标
- **THEN** 显示CPU使用率、内存占用、网络连接数，应用启动时间

#### Scenario: 查看数据统计
- **WHEN** 管理员查看数据统计
- **THEN** 显示用户总数、题目总数、试卷总数、考试记录总数、待评分记录数

#### Scenario: 平台升级
- **WHEN** 管理员点击检查更新
- **THEN** 连接GitHub API检测最新版本，比较当前版本，提示升级

### Requirement: API服务层
系统 SHALL 提供统一的API服务层，包含：
- 集中化的API请求管理
- 自动 Token 刷新机制
- 请求重试机制（最多3次）
- 统一的错误处理

#### Scenario: API请求成功
- **WHEN** 前端发起API请求
- **THEN** 请求经过拦截器添加认证Token，发送至后端，返回统一格式响应

#### Scenario: 请求失败重试
- **WHEN** API请求返回网络错误或5xx错误
- **THEN** 系统自动重试最多3次，间隔1秒/2秒/4秒指数退避

#### Scenario: Token过期
- **WHEN** API返回401未授权
- **THEN** 系统自动尝试刷新Token，刷新成功后重试原请求

### Requirement: MySQL连接健壮性
系统 SHALL 提供稳定的MySQL连接：
- 连接超时30秒
- 连接池最小2个连接
- 空闲连接超时60秒
- 失败自动重连（指数退避）

#### Scenario: MySQL连接超时
- **WHEN** MySQL连接超时
- **THEN** 系统记录错误日志，返回友好错误信息给用户

#### Scenario: MySQL连接恢复
- **WHEN** MySQL连接断开后恢复
- **THEN** 系统自动重新建立连接，无需重启服务

### Requirement: 全局错误处理
系统 SHALL 提供全局错误处理：
- 捕获所有未处理的Promise rejection
- 记录详细错误堆栈到 logs/error.log
- 返回统一的错误响应格式
- 请求日志记录到 logs/request.log

### Requirement: CI/CD自动化
系统 SHALL 提供完整的CI/CD流程：
- GitHub Actions 自动构建、测试、发布
- 创建GitHub Release并上传构建产物
- 支持标签触发发布（v*.*.*）

#### Scenario: 代码推送触发构建
- **WHEN** 开发者推送代码到main分支或创建v*标签
- **THEN** GitHub Actions自动执行：Lint → Build Client → Build Server → Create Release

#### Scenario: 管理员在线升级
- **WHEN** 管理员在系统设置页面点击"执行升级"
- **THEN** 系统下载GitHub Release包，自动备份当前版本，执行更新，提示重启

#### Scenario: 升级失败自动回滚
- **WHEN** 在线升级过程中发生错误
- **THEN** 系统自动从backups目录恢复上一版本，保证服务可用

## MODIFIED Requirements

### Requirement: 登录功能
**MODIFIED**: 登录请求通过新的API服务层发送，支持自动重试和错误处理

## REMOVED Requirements
无