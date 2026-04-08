# Checklist - 宣推服务与双写备份

## Part 1: 双写备份机制

- [x] **db.js 双写逻辑实现**
  - [x] db.js 正确导入 db-mysql
  - [x] 写操作同时写入 MySQL 和 JSON
  - [x] MySQL 异常时自动降级到 JSON
  - [x] 写入失败时返回正确的成功响应（降级模式）
  - [x] 双写状态标记正确

- [x] **MySQL 恢复自动同步**
  - [x] 检测 MySQL 恢复连接
  - [x] 增量同步 JSON 数据到 MySQL
  - [x] 同步状态记录（lastSync）
  - [x] 后台定时检测机制

- [x] **数据库监测页面更新**
  - [x] 显示当前存储模式（MySQL/JSON/双写/降级）
  - [x] 显示 MySQL 连接状态
  - [x] 显示 JSON 文件状态
  - [x] 显示同步状态和最后同步时间
  - [x] 显示各自记录数

## Part 2: 宣推服务模块

### 后端

- [x] **路由 server/routes/promotions.js**
  - [x] GET /api/promotions 返回文案列表（权限过滤）
  - [x] GET /api/promotions/:id 返回单个文案
  - [x] POST /api/promotions 创建文案（含报名开关）
  - [x] PUT /api/promotions/:id 更新文案（创建者权限校验）
  - [x] DELETE /api/promotions/:id 删除文案（创建者权限校验）
  - [x] POST /api/promotions/:id/signup 用户报名
  - [x] POST /api/promotions/:id/lock 锁定文案（仅管理员）
  - [x] POST /api/promotions/:id/unlock 解锁文案（仅管理员）

- [x] **报名记录路由**
  - [x] GET /api/promotions/:id/signups 返回报名列表
  - [x] 支持导出功能

### 前端

- [x] **PromotionList.vue 文案列表页**
  - [x] 表格展示所有文案（Arco Design 规范）
  - [x] 支持搜索、状态筛选
  - [x] 管理员显示锁定/解锁按钮
  - [x] 普通用户不显示锁定功能
  - [x] 快捷键 Ctrl+S 保存, Ctrl+P 预览

- [x] **PromotionEdit.vue 文案编辑页**
  - [x] 富文本编辑器正常加载
  - [x] 报名开关可配置
  - [x] 管理员可配置锁定状态
  - [x] 保存功能正常

- [x] **PromotionView.vue 用户端页面**
  - [x] 正确展示文案内容
  - [x] 报名按钮显示正确
  - [x] 报名表单提交正常

- [x] **API 和路由**
  - [x] 前端 API 导出正确
  - [x] 路由配置正确
  - [x] 菜单显示正确（一级"宣推服务"，二级"海报与报名"）

## Part 3: UI 一致性优化

- [x] **Arco Design 规范**
  - [x] 使用 @arco-design/web-vue-icons 图标库
  - [x] 按钮、表单、表格、卡片组件统一
  - [x] 页面布局使用 page-view、page-header-content

- [x] **系统设置页面优化**
  - [x] 统一卡片样式
  - [x] 统一表格样式
  - [x] Icon 风格一致

## 功能验证

- [x] **双写功能**
  - [x] MySQL 正常时数据写入两个存储
  - [x] MySQL 异常时只写入 JSON
  - [x] MySQL 恢复后自动同步数据
  - [x] 数据库监测正确显示状态

- [x] **宣推服务**
  - [x] 管理员可创建宣传文案
  - [x] 管理员可查看所有文案
  - [x] 管理员可锁定/解锁任意文案
  - [x] 普通用户只能查看自己创建的文案
  - [x] 普通用户不能编辑他人创建的文案
  - [x] 文案列表显示正确
  - [x] 用户可见宣传页面（未锁定）
  - [x] 报名功能正常

- [x] **UI 一致性**
  - [x] 页面风格与其他模块一致
  - [x] Icon 使用统一