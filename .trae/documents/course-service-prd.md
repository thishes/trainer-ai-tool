# 课程服务（Course Service）- 产品需求文档（PRD）

## 1. 背景与目标

### 1.1 背景
trainer-ai-tool 目前已具备考试、题库、试卷、公告、促销等模块，但缺少**知识内容管理**能力。用户需要一个类似 VitePress/Notion 的**文档型课程系统**，用于：
- 发布培训教材、学习笔记、操作手册
- 为每门课程提供独立的公开访问页面
- 灵活的权限控制（谁可以查看）

### 1.2 目标
构建一个轻量级但功能完整的**课程内容服务**模块，支持：
- 创建/编辑富文本课程内容
- 多章节组织结构（目录树）
- 每门课程独立访问 URL
- 基于创建者的权限控制体系
- 公开/私密/密码保护等多种可见性模式

### 1.3 非目标（本阶段不做）
- 视频嵌入播放
- 在线实时协作编辑
- 课程进度追踪/学习记录
- 课程评论/讨论区
- 付费购买/支付集成
- PDF 导出

---

## 2. 用户角色

| 角色 | 权限说明 |
|------|---------|
| **管理员(admin)** | 所有课程的 CRUD + 删除任意课程 + 查看所有课程统计 |
| **讲师(trainer)** | 创建/编辑自己的课程 + 管理自己课程的章节和权限 |
| **普通用户(user)** | 查看有权限的课程（通过分享链接或授权） |
| **访客(anonymous)** | 查看公开课程（无需登录） |

---

## 3. 核心概念

### 3.1 课程(Course)
课程是顶层容器，包含元信息和章节列表。

```
课程 = {
  id, title, description, cover_image,
  visibility, access_password,
  user_id(创建者), status,
  created_at, updated_at,
  view_count(阅读量), like_count(点赞数)
}
```

### 3.2 章节(Chapter)
章节是课程的内容单元，支持层级嵌套。

```
章节 = {
  id, course_id,
  title, content(富文本HTML),
  parent_id(父章节ID, null=顶级),
  sort_order(排序),
  status(draft/published),
  created_at, updated_at
}
```

### 3.3 可见性模式(Visibility)

| 模式 | 说明 | 访问方式 |
|------|------|---------|
| `public` | 完全公开 | 任何人可通过链接访问 |
| `password` | 密码保护 | 输入正确密码后可查看 |
| `private` | 仅限指定人员 | 需要登录且在允许列表中 |
| `link` | 链接访问 | 知道链接即可访问（不索引） |

### 3.4 访问 URL 格式
```
公开访问: /course/:id 或 /course/:slug
管理入口: Dashboard → "课程" Tab
```

---

## 4. 功能需求

### 4.1 课程管理（Dashboard 内）

#### 4.1.1 课程列表
- 展示当前用户创建的所有课程（admin 可看全部）
- 支持搜索（标题关键词）
- 支持按状态筛选（草稿/已发布）
- 显示：封面缩略图、标题、状态、章节数、浏览量、创建时间、操作按钮
- 分页展示
- 操作：编辑、发布/下架、复制链接、删除

#### 4.1.2 创建/编辑课程
- 基本信息：标题、描述、封面图上传
- 可见性设置：public / password / private / link
- 密码设置（当选择 password 模式时）
- 允许的用户列表（当选择 private 模式时，支持多选用户）

#### 4.1.3 章节管理（课程编辑器内）
- 树形结构的章节列表（支持拖拽排序）
- 支持 3 级嵌套（顶级章节 → 子章节 → 小节）
- 每个章节可独立设置状态（草稿/发布）
- 富文本编辑器（复用现有 wangEditor）
- 章节的 CRUD：新增、编辑、删除、拖拽排序
- 批量操作：批量发布、批量设为草稿

### 4.2 课程公开访问页

#### 4.2.1 课程首页 `/course/:id`
- 课程封面大图 + 标题 + 描述
- 章节目录侧边栏（可折叠）
- 主内容区显示选中章节的富文本内容
- 章节间导航（上一篇/下一篇）
- 浏览量计数
- 点赞功能（可选）

#### 4.2.2 密码验证页
- 当课程为 password 模式时，先展示密码输入框
- 输入正确后跳转到课程首页（sessionStorage 存储解锁状态）

#### 4.2.3 私有课程访问
- 未登录时提示登录
- 登录后检查是否在允许列表中
- 不在列表中显示"无权访问"

### 4.3 统计功能（Dashboard 内）
- 每门课程的浏览量统计
- 章节阅读热度排行
- 最近访问时间线

---

## 5. 数据模型

### 5.1 courses 表

```sql
CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(100) UNIQUE COMMENT 'URL友好标识',
  title VARCHAR(200) NOT NULL COMMENT '课程标题',
  description TEXT COMMENT '课程描述',
  cover_image VARCHAR(500) COMMENT '封面图片URL',
  visibility ENUM('public','password','private','link') DEFAULT 'public' COMMENT '可见性',
  access_password VARCHAR(100) COMMENT '访问密码(password模式)',
  user_id INT NOT NULL COMMENT '创建者ID',
  status ENUM('draft','published') DEFAULT 'draft' COMMENT '状态',
  view_count INT DEFAULT 0 COMMENT '浏览量',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  settings JSON COMMENT '扩展配置(允许用户列表等)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_status (user_id, status),
  INDEX idx_visibility (visibility),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5.2 chapters 表

```sql
CREATE TABLE chapters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL COMMENT '所属课程',
  parent_id INT DEFAULT NULL COMMENT '父章节ID',
  title VARCHAR(200) NOT NULL COMMENT '章节标题',
  content LONGTEXT COMMENT '章节内容(富文本HTML)',
  sort_order INT DEFAULT 0 COMMENT '排序权重',
  status ENUM('draft','published') DEFAULT 'draft' COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course_parent (course_id, parent_id),
  INDEX idx_course_order (course_id, sort_order),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5.3 course_access 表（私有课程授权）

```sql
CREATE TABLE course_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL COMMENT '课程ID',
  user_id INT NOT NULL COMMENT '被授权用户ID',
  granted_by INT NOT NULL COMMENT '授权人ID',
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_course_user (course_id, user_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 6. API 设计

### 6.1 课程 CRUD

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/courses` | ✅ | 课程列表（分页+筛选） |
| POST | `/api/courses` | ✅ | 创建课程 |
| GET | `/api/courses/:id` | ✅ | 课程详情（含章节） |
| PUT | `/api/courses/:id` | ✅ | 更新课程 |
| DELETE | `/api/courses/:id` | ✅ | 删除课程 |
| PATCH | `/api/courses/:id/publish` | ✅ | 发布/下架 |

### 6.2 章节管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/courses/:id/chapters` | ✅ | 章节树形列表 |
| POST | `/api/courses/:id/chapters` | ✅ | 创建章节 |
| PUT | `/api/courses/:id/chapters/:chapterId` | ✅ | 更新章节 |
| DELETE | `/api/courses/:id/chapters/:chapterId` | ✅ | 删除章节 |
| PUT | `/api/courses/:id/chapters/reorder` | ✅ | 批量重排 |
| PATCH | `/api/courses/:id/chapters/batch-publish` | ✅ | 批量发布 |

### 6.3 公开访问（无需认证/可选认证）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/public/courses/:id` | ❌ | 公开课程详情 |
| GET | `/api/public/courses/:id/chapters` | ❌ | 公开章节列表 |
| GET | `/api/public/courses/:id/chapters/:chapterId` | ❌ | 章节内容 |
| POST | `/api/public/courses/:id/unlock` | ❌ | 密码解锁验证 |
| POST | `/api/public/courses/:id/view` | ❌ | 记录浏览量 |

### 6.4 权限管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/courses/:id/access` | ✅ | 授权用户列表 |
| POST | `/api/courses/:id/access` | ✅ | 添加授权用户 |
| DELETE | `/api/courses/:id/access/:userId` | ✅ | 移除授权用户 |

---

## 7. 前端页面设计

### 7.1 Dashboard 新增 Tab
在现有 Dashboard 导航中新增 **"课程"** Tab（位于 "announcements" 之后），遵循现有的 `activatedTabs` 懒加载模式。

### 7.2 新增页面组件

| 组件 | 路径 | 用途 |
|------|------|------|
| CoursesPanel.vue | views/CoursesPanel.vue | Dashboard 内的课程管理面板 |
| CourseEditor.vue | views/CourseEditor.vue | 课程编辑器（含章节树+富文本编辑器） |
| CourseView.vue | views/CourseView.vue | 公开课程访问页（独立路由） |
| CourseUnlock.vue | views/CourseUnlock.vue | 密码验证页 |

### 7.3 路由配置

```javascript
{ path: '/course/:id', name: 'CourseView', component: CourseView },
// 无需 requiresAuth，公开访问
```

### 7.4 Nginx 配置补充
无需额外配置，`/course/:id` 由前端 SPA 处理（try_files 回退到 index.html），API 走 `/api/` 代理。

---

## 8. 技术约束与规范

### 8.1 复用现有组件
- **富文本编辑器**: 复用 `wangEditor`（已在公告模块中使用）
- **图片上传**: 复用 `/api/upload` 接口
- **SafeHtml**: 复用 SafeHtml 组件渲染内容
- **分页**: 复用 Arco Design a-pagination 组件
- **认证中间件**: authenticate / requireAdminOrOwner

### 8.2 数据安全
- 章节内容使用 SafeHtml 渲染（防 XSS）
- 密码 bcrypt 加密存储
- API 输入验证使用 Joi schemas
- 私有课程严格校验访问权限

### 8.3 性能考虑
- 章节内容懒加载（只加载当前选中章节）
- 课程列表支持缓存（TTL 120s）
- 公开课程详情支持 CDN 缓存
- 浏览量异步更新（不影响响应速度）

### 8.4 兼容性
- 数据库表自动创建（ensureColumns 模式）
- 向后兼容旧版本数据
- 前端渐进增强（不支持的功能优雅降级）

---

## 9. 里程碑规划

### Phase 1: MVP（最小可用版本）
- 课程 CRUD（基本信息）
- 章节树形管理（CRUD + 排序）
- 富文本编辑
- public/link 模式的公开访问页
- Dashboard 集成

### Phase 2: 权限增强
- password 密码保护模式
- private 私有模式 + 授权管理
- 浏览量统计
- 课程分享/复制链接

### Phase 3: 体验优化
- 章节搜索
- 目录高亮当前位置
- 移动端适配优化
- 课程模板
- 导入/导出（Markdown）
