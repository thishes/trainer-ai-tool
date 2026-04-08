# Checklist - 系统优化与MySQL迁移

## 阶段一：API集中管理机制

- [x] apiService.js 基础类创建完成，包含fetch封装
- [x] 请求拦截器实现，自动添加Authorization头
- [x] 响应拦截器实现，统一错误处理
- [x] 重试机制实现，支持指数退避（最多3次，1s/2s/4s）
- [x] authApi.js 创建完成
- [x] questionsApi.js 创建完成
- [x] papersApi.js 创建完成
- [x] examApi.js 创建完成
- [x] announcementsApi.js 创建完成
- [x] usersApi.js 创建完成
- [x] Login.vue 集成新API服务
- [x] Dashboard.vue 集成新API服务

## 阶段二：MySQL连接健壮性

- [x] db-mysql.js MySQL连接超时配置30秒
- [x] db-mysql.js 连接池最小2个连接配置
- [x] db-mysql.js 空闲连接超时60秒配置
- [x] 连接失败自动重试机制实现（指数退避）
- [x] 连接健康检查函数实现
- [x] 连接断开自动恢复机制实现
- [x] 数据库表结构验证实现
- [x] 数据迁移错误处理完善
- [x] db-mysql.js 已就绪，待MySQL服务器连接稳定后启用

## 阶段三：后端路由MySQL适配

- [x] 所有路由文件统一使用db.js存储层
- [x] 路由文件无遗留JSON API调用（均通过db.js统一接口）
- [ ] exam.js 等路由待db-mysql.js启用后适配
- [ ] 登录功能测试通过
- [ ] 题目CRUD测试通过
- [ ] 试卷CRUD测试通过
- [ ] 考试记录功能测试通过

## 阶段四：系统健壮性增强

- [x] errorHandler.js 全局错误处理中间件
- [x] 统一错误响应格式
- [x] 详细错误日志记录
- [x] 请求日志记录功能
- [x] 日志系统统一格式
- [x] 请求超时中间件配置

## 阶段五：管理员系统设置模块

### 后端接口
- [x] system.js 路由创建完成
- [x] GET /api/system/info - 服务器信息接口
- [x] GET /api/system/metrics - 运行指标接口
- [x] GET /api/system/stats - 数据统计接口
- [x] GET /api/system/logs - 系统日志接口

### 前端页面
- [x] SystemSettings.vue 创建完成
- [x] 服务器信息展示组件（Node.js版本、操作系统、端口、运行时长）
- [x] 运行指标展示组件（CPU、内存、网络连接数）
- [x] 数据统计展示组件（用户数、题目数、试卷数、考试记录数）
- [x] 平台升级功能组件（版本检测、升级执行）
- [x] 系统日志查看组件（操作日志、错误日志）
- [x] 系统设置页面路由配置

### 导航集成
- [x] Dashboard侧边栏添加系统设置菜单
- [x] 权限控制实现（仅管理员可见）

## 阶段六：CI/CD自动化

### GitHub Actions
- [x] ci-cd.yml 工作流文件创建
- [x] Lint 和测试阶段
- [x] 客户端构建阶段
- [x] 服务端打包阶段
- [x] Release 创建和发布阶段
- [x] 触发条件配置（push/tag/PR）

### 服务器端更新
- [x] update-script.js 创建完成
- [x] 版本检查功能（checkForUpdates）
- [x] 下载GitHub Release功能
- [x] 自动备份当前版本
- [x] 解压安装更新包
- [x] 失败自动回滚
- [x] 完整日志记录

### API集成
- [x] GET /api/system/upgrade/check - 返回完整Release信息
- [x] POST /api/system/upgrade - 执行升级
- [x] 升级提示需要重启服务