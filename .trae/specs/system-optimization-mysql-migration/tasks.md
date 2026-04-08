# Tasks - 系统优化与MySQL迁移

## 阶段一：API集中管理机制

- [x] Task 1.1: 创建前端API服务层（apiService.js）
  - [x] 创建统一的API服务基础类
  - [x] 实现请求拦截器（添加Token）
  - [x] 实现响应拦截器（统一错误处理）
  - [x] 实现请求重试机制

- [x] Task 1.2: 创建各模块API调用文件
  - [x] 创建 authApi.js - 认证相关API
  - [x] 创建 questionsApi.js - 题目相关API
  - [x] 创建 papersApi.js - 试卷相关API
  - [x] 创建 examApi.js - 考试相关API
  - [x] 创建 announcementsApi.js - 公告相关API
  - [x] 创建 usersApi.js - 用户相关API

- [x] Task 1.3: 更新前端代码使用新API服务
  - [x] 更新 Login.vue 使用 authApi
  - [x] 更新 Dashboard.vue 使用各模块API

## 阶段二：MySQL连接健壮性优化

- [x] Task 2.1: 优化db-mysql.js MySQL连接配置
  - [x] 添加连接超时配置（30秒）
  - [x] 添加连接池配置（最小2个连接）
  - [x] 添加空闲连接超时配置
  - [x] 实现连接失败重试机制

- [x] Task 2.2: 添加MySQL连接健康检查
  - [x] 实现定时连接检测
  - [x] 添加连接断开自动恢复
  - [x] 添加连接状态监控

- [x] Task 2.3: 完善MySQL数据库初始化
  - [x] 验证数据库表结构完整性
  - [x] 添加数据迁移脚本错误处理
  - [x] 实现数据校验机制

## 阶段三：后端路由MySQL适配

- [ ] Task 3.1: 更新exam.js路由使用MySQL
  - [ ] 修改考试提交接口
  - [ ] 修改成绩查询接口
  - [ ] 修改统计接口
  - [ ] 修改评分接口

- [ ] Task 3.2: 检查其他可能遗漏的路由
  - [ ] 检查所有路由文件
  - [ ] 确保无遗留的JSON API调用

## 阶段四：系统健壮性增强

- [x] Task 4.1: 添加全局错误处理中间件
  - [x] 创建 errorHandler.js
  - [x] 统一错误响应格式
  - [x] 记录详细错误日志

- [x] Task 4.2: 添加请求超时控制
  - [x] 配置请求超时中间件
  - [x] 实现超时中断和清理

- [x] Task 4.3: 添加日志系统
  - [x] 统一日志格式
  - [x] 添加请求日志记录
  - [x] 添加错误日志记录

## 阶段五：管理员系统设置模块

- [x] Task 5.1: 创建后端系统管理路由（system.js）
  - [x] 获取服务器信息接口
  - [x] 获取运行指标接口
  - [x] 获取数据统计接口
  - [x] 系统日志接口

- [x] Task 5.2: 创建前端系统设置页面
  - [x] 创建 SystemSettings.vue
  - [x] 实现服务器信息展示
  - [x] 实现运行指标展示
  - [x] 实现数据统计展示
  - [x] 实现平台升级功能
  - [x] 实现系统日志查看

- [x] Task 5.3: 集成系统设置到导航
  - [x] 在Dashboard侧边栏添加系统设置入口
  - [x] 添加权限控制（仅管理员可见）

## 阶段六：CI/CD自动化

- [x] Task 6.1: 创建GitHub Actions工作流
  - [x] 创建 ci-cd.yml 工作流文件
  - [x] 配置Lint和测试阶段
  - [x] 配置客户端构建阶段
  - [x] 配置服务端打包阶段
  - [x] 配置Release创建阶段

- [x] Task 6.2: 创建服务器端更新脚本
  - [x] 创建 update-script.js
  - [x] 实现从GitHub下载更新包
  - [x] 实现自动备份功能
  - [x] 实现失败自动回滚
  - [x] 实现版本检查功能

- [x] Task 6.3: 集成更新脚本到系统路由
  - [x] 更新 system.js 的 upgrade/check 接口
  - [x] 更新 system.js 的 upgrade 接口
  - [x] 添加自动下载GitHub Release功能

## Task Dependencies

- Task 1.2 依赖 Task 1.1
- Task 1.3 依赖 Task 1.2
- Task 2.2 依赖 Task 2.1
- Task 3.1 依赖 Task 2.1
- Task 3.2 无依赖，可并行
- Task 5.2 依赖 Task 5.1
- Task 5.3 依赖 Task 5.2
- Task 6.2 依赖 Task 6.1
- Task 6.3 依赖 Task 6.2