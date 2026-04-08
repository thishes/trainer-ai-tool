# Tasks - 宣推服务与双写备份

## Part 1: 双写备份机制

- [ ] Task 1.1: 修改 db.js 添加 MySQL 双写支持
  - [ ] 1.1.1: 在 db.js 中导入 db-mysql
  - [ ] 1.1.2: 修改写操作函数（create/update/delete）实现双写
  - [ ] 1.1.3: 添加 MySQL 异常时的降级逻辑
  - [ ] 1.1.4: 添加双写状态标记

- [ ] Task 1.2: 实现 MySQL 恢复后的自动同步
  - [ ] 1.2.1: 检测 MySQL 恢复连接
  - [ ] 1.2.2: 实现增量同步逻辑
  - [ ] 1.2.3: 添加同步状态记录
  - [ ] 1.2.4: 后台定时检测和同步

- [ ] Task 1.3: 更新数据库监测页面
  - [ ] 1.3.1: 显示当前存储模式（MySQL/JSON/双写/降级）
  - [ ] 1.3.2: 显示 MySQL 和 JSON 各自的记录数
  - [ ] 1.3.3: 显示同步状态和最后同步时间

## Part 2: 宣推服务模块

### 2.1 后端路由

- [ ] Task 2.1: 创建宣传文案路由 `server/routes/promotions.js`
  - [ ] 2.1.1: GET /api/promotions - 获取文案列表（管理员返回全部，普通用户返回自己的）
  - [ ] 2.1.2: GET /api/promotions/:id - 获取单个文案
  - [ ] 2.1.3: POST /api/promotions - 创建文案
  - [ ] 2.1.4: PUT /api/promotions/:id - 更新文案（校验创建者权限）
  - [ ] 2.1.5: DELETE /api/promotions/:id - 删除文案（校验创建者权限）
  - [ ] 2.1.6: POST /api/promotions/:id/signup - 用户报名
  - [ ] 2.1.7: POST /api/promotions/:id/lock - 锁定文案（仅管理员）
  - [ ] 2.1.8: POST /api/promotions/:id/unlock - 解锁文案（仅管理员）

- [ ] Task 2.2: 创建报名记录路由
  - [ ] 2.2.1: GET /api/promotions/:id/signups - 获取报名列表（管理员）
  - [ ] 2.2.2: GET /api/promotions/:id/signups/export - 导出报名数据

### 2.2 前端页面

- [ ] Task 2.3: 创建宣传文案管理页面 `client/src/views/PromotionList.vue`
  - [ ] 2.3.1: 表格展示文案列表（Arco Design 规范）
  - [ ] 2.3.2: 快捷功能键支持（Ctrl+S 保存, Ctrl+P 预览）
  - [ ] 2.3.3: 搜索和筛选功能

- [ ] Task 2.4: 创建文案编辑页面 `client/src/views/PromotionEdit.vue`
  - [ ] 2.4.1: 富文本编辑器（复用公告编辑器）
  - [ ] 2.4.2: 报名开关配置
  - [ ] 2.4.3: 保存和预览功能

- [ ] Task 2.5: 创建用户端宣传页面 `client/src/views/PromotionView.vue`
  - [ ] 2.5.1: 展示文案内容
  - [ ] 2.5.2: 报名按钮（如果开启）
  - [ ] 2.5.3: 报名表单

- [ ] Task 2.6: 添加前端 API 导出 `client/src/api/index.js`
  - [ ] 2.6.1: 添加 promotion 相关 API

- [ ] Task 2.7: 配置路由和菜单
  - [ ] 2.7.1: 添加路由配置
  - [ ] 2.7.2: 添加侧边栏菜单（一级"宣推服务"，二级"海报与报名"）

## Part 3: UI 一致性优化

- [ ] Task 3.1: 优化系统设置页面样式
  - [ ] 3.1.1: 统一卡片和表格样式
  - [ ] 3.1.2: 统一 Icon 风格（使用 @arco-design/web-vue-icons）

- [ ] Task 3.2: 新增页面 UI 规范检查
  - [ ] 3.2.1: 确保所有新增页面遵循 Arco Design 规范

## Task Dependencies
- Task 1.1 完成后才能测试双写
- Task 1.2 依赖于 Task 1.1
- Task 1.3 依赖于 Task 1.1 和 1.2
- Task 2.1 完成后才能开发前端页面
- Task 2.3 和 2.4 可并行开发
- Task 3.1 可在开发过程中同步进行
