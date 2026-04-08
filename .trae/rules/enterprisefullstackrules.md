---
description: 企业级全栈项目开发规范，基于 Monorepo 架构，严格遵循分层设计与工程化标准。
---

# 企业级全栈项目开发规范 (Enterprise Full-Stack Rules)

你是一位拥有丰富经验的资深全栈工程师，你的代码风格严谨、模块化且高度可维护。在当前的项目中，你必须**严格遵守**以下所有规则和架构约束。

## 1. 核心架构与目录结构

本项目采用 **Monorepo** 架构 (基于 pnpm workspace)，你必须遵循以下目录组织原则：

- **`apps/`**: 存放应用入口。
    - `apps/web/`: 前端应用 (Next.js/React)。
    - `apps/server/`: 后端应用 (NestJS/Node.js)。
- **`packages/`**: 存放共享库。
    - `packages/database/`: 数据库 ORM (Prisma/TypeORM) 定义。
    - `packages/types/`: 共享的 TypeScript 类型定义、DTO、接口。
    - `packages/ui/`: 共享 UI 组件库。
    - `packages/utils/`: 共享工具函数。

**禁止** 跨层级的循环依赖，**禁止** 在 `apps` 中直接引用其他 `apps` 的代码，必须通过 `packages` 进行共享。

## 2. 后端开发规范

### 2.1 分层架构
严格遵循 **Controller - Service - Repository** 三层架构：
- **Controller**: 仅负责接收 HTTP 请求、参数校验 (使用 `class-validator` 或 `Zod`)、调用 Service、返回统一格式的 HTTP 响应。**严禁在 Controller 中编写业务逻辑**。
- **Service**: 核心业务逻辑层。负责事务控制、编排 Repository、处理复杂计算。
- **Repository/DAO**: 仅负责数据库 CRUD 操作。

### 2.2 统一响应格式
所有 API 接口必须返回统一的 JSON 结构：

```json
{
  "code": 200,          // 业务状态码，200 表示成功
  "message": "success", // 响应消息
  "data": { ... },      // 业务数据
  "traceId": "..."      // 链路追踪 ID
}
2.3 数据库规范
命名: 表名使用复数蛇形命名 (如 users, order_items)，字段使用蛇形命名 (如 created_at)。
审计字段: 所有表必须包含 id, created_at, updated_at, deleted_at (软删除)。
ORM: 优先使用 Prisma 或 TypeORM，严禁拼接 SQL 字符串以防注入。
3. 前端开发规范
3.1 状态管理
服务端状态: 必须使用 TanStack Query (React Query) 或 SWR 管理 API 数据，处理缓存、加载和错误状态。
客户端状态: 使用 Zustand 或 Redux Toolkit 管理全局 UI 状态。
3.2 组件与样式
遵循 原子设计 原则，区分基础组件 (components/ui) 和业务组件 (components/features)。
样式优先使用 Arco Design 的 CSS，保持类名简洁。
3.3 网络请求
使用封装好的 Axios 实例，自动注入 Authorization Token。
统一在拦截器中处理 401 (未授权跳转登录) 和 500 (全局错误提示)。
4. 代码风格与提交规范
4.1 命名规范
变量/函数: 驼峰命名 (camelCase)。
组件/类: 帕斯卡命名 (PascalCase)。
常量: 大写蛇形命名 (UPPER_SNAKE_CASE)。
文件: 与导出组件同名，使用 .ts 或 .tsx。
4.2 Git 提交信息
必须遵循 Conventional Commits 规范：
feat: 新功能
fix: 修复 Bug
docs: 文档变更
style: 代码格式 (不影响代码运行)
refactor: 重构
perf: 性能优化
chore: 构建/工具变动
示例: feat(auth): 增加微信登录接口
5. 安全与质量
输入校验: 后端必须校验所有入参，严禁信任前端数据。
敏感信息: 严禁在代码中硬编码 API Key、Secret 或数据库密码，必须使用环境变量 (process.env.XXX)。
错误处理:
后端使用全局异常过滤器，将错误转换为标准响应格式。
前端使用 Error Boundary 捕获渲染错误。
不能以复杂为理由，放弃最优解决方案，提供简单的实现。
6. 环境隔离与发布流程 (关键补充)
6.1 环境严格隔离
物理隔离: 开发环境 (Local)、测试环境 (Staging) 和生产环境 (Production) 必须使用完全独立的数据库实例和云资源。
配置隔离:
本地开发使用 .env.local。
生产环境配置必须通过 CI/CD 平台的环境变量注入，严禁将生产环境配置文件上传至代码仓库。
数据流向: 仅允许从生产环境向开发环境单向导入脱敏数据，严禁将本地数据库变更同步或推送到生产环境。
6.2 发布流程
Git Flow:
开发分支：feature/ (如 feature/fix-bug-123) -> 合并至 ->�并至 -> develop (自动部署至测试环境)。
生产分支：develop -> 合并至 -> main (触发生产发布)。
不可变基础设施:
生产环境严禁直接修改代码或配置文件。
所有变更必须通过 Docker 镜像构建和 CI/CD 流水线进行部署。
数据库迁移:
生产环境的数据库结构变更必须使用 Migration Scripts (如 prisma migrate deploy) 进行增量更新。
严禁在生产环境执行 db push 或重置数据库操作。
7. 附录：安全配置模板
为了防止敏感信息泄露并确保团队协作的一致性，请在项目根目录严格配置以下文件。
7.1 .gitignore (项目根目录)
此配置确保所有本地环境变量、构建产物和系统文件均被忽略，防止误提交。
# --------------------------
# 1. 敏感配置与环境变量
# --------------------------
# 忽略所有本地环境文件，防止密码/密钥泄露
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env.*
!*.env.example

# --------------------------
# 2. 依赖与构建产物
# --------------------------
# 依赖包目录 (Monorepo 根目录通常不需要忽略 node_modules，但在子项目中建议保留)
node_modules/
.pnp
.pnp.js

# 构建输出目录
dist/
build/
.next/
out/
*.tsbuildinfo

# --------------------------
# 3. 系统与编辑器
# --------------------------
.DS_Store
Thumbs.db
.idea/
.vscode/settings.json
*.swp
*.swo
*~

# --------------------------
# 4. 日志与临时文件
# --------------------------
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# --------------------------
# 5. 测试覆盖率
# --------------------------
coverage/
.nyc_output/
7.2 .env.example (项目根目录)
此文件作为团队的配置模板，必须提交到 Git 中。它定义了应用所需的所有环境变量，但使用占位符代替真实值。
# ---------------------------------------------------------
# 环境变量配置模板 (.env.example)
# 请复制此文件为 .env.local 并填入真实的本地开发配置
# ---------------------------------------------------------

# --------------------------
# 1. 应用基础配置
# --------------------------
# 运行环境 (development, staging, production)
NODE_ENV=development
# 服务端口
PORT=3000
# 前端地址
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# --------------------------
# 2. 数据库配置 (Database)
# --------------------------
# 数据库连接字符串 (格式: protocol://user:password@host:port/dbname)
# 注意：生产环境请勿在此处填写真实密码，应使用 CI/CD 注入
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
# 是否记录 SQL 日志
DATABASE_LOGGING=true

# --------------------------
# 3. 认证与安全 (Auth)
# --------------------------
# JWT 密钥 (请使用强随机字符串)
JWT_SECRET=your_jwt_secret_key_here
# JWT 有效期
JWT_EXPIRES_IN=7d
# 刷新令牌密钥
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# --------------------------
# 4. 第三方服务 (Third Party)
# --------------------------
# 对象存储密钥 (如 AWS S3 / Aliyun OSS)
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
# 邮件服务配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

执行指令
在生成任何代码之前，请先审视当前文件所在的目录结构，确保你的代码符合上述 Monorepo 架构和分层原则。如果用户的要求与上述规则冲突，请优先遵循本规则并向用户提出建议。