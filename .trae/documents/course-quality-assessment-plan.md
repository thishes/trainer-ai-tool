# 课程服务质量评估与优化方案 v1.0

> 📅 创建日期: 2026-04-23
> 🎯 优化目标: 以"用户为中心"提升课程管理全链路体验
> 📊 评估范围: 需求文档(PRD) + 用户故事 + 前后端实现 + 交互体验

---

## 一、执行摘要 (Executive Summary)

### 当前状态评分: ⭐⭐☆☆☆ (2/5)

| 维度 | 评分 | 核心问题 |
|------|------|---------|
| 需求完整性 | ★★☆☆☆ | 缺少学习追踪、反馈、协作等关键场景 |
| 交互流畅度 | ★★★☆☆ | 基本可用但细节体验差 |
| 信息架构 | ★★★☆☆ | 结构清晰但层级过深 |
| 可访问性 | ★★☆☆☆ | 移动端适配严重不足 |
| 性能感知 | ★★★☆☆ | 有缓存但加载反馈差 |

### 核心发现:
1. **🔴 关键缺陷**: 缺少"学习进度追踪"闭环（用户无法知道学到哪了）
2. **🟡 体验断点**: 编辑器→预览→发布的流程不够顺畅
3. **🟢 改进机会**: 权限管理可大幅简化（当前过于技术化）

---

## 二、需求文档质量评估

### 2.1 ✅ 已覆盖的优秀部分

#### [course-service-prd.md](../../.trae/documents/course-service-prd.md) 的亮点:

| 功能点 | 覆盖度 | 实现质量 | 备注 |
|--------|--------|---------|------|
| CRUD基础操作 | ✅ 完整 | ★★★★☆ | API设计合理 |
| 章节树形管理 | ✅ 完整 | ★★★☆☆ | 支持拖拽排序 |
| 访问控制(3种) | ✅ 完整 | ★★★☆☆ | public/private/password |
| 密码保护 | ✅ 完整 | ★★★★☆ | sessionStorage实现 |
| Slug友好URL | ✅ 完整 | ★★★★☆ | SEO友好 |

#### [course-service-stories.md](../../.trae/documents/course-service-stories.md) 的亮点:

- ✅ 用户故事格式标准（As a... I want to... So that...）
- ✅ 验收条件清晰（Given/When/Then）
- ✅ 覆盖角色全面（培训师/管理员/学员）

### 2.2 ❌ 缺失的关键需求

#### 🔴 P0级 - 必须补充（影响核心价值）

##### 1️⃣ 学习进度追踪系统
**现状**: PRD仅提及"支持查看学习记录"，但未定义：
- [ ] 进度计算逻辑（按章节？按时间？按完成度？）
- [ ] 断点续学机制（下次打开自动跳转到最后阅读位置）
- [ ] 学习时长统计
- [ ] 完成率可视化（进度环/进度条）

**用户痛点**:
```
❌ 场景: 学员A学习了10章，关闭浏览器后再次访问
❌ 问题: 不知道上次学到哪了，需要从头翻找
❌ 期望: 自动定位到"第11章 第3节"
```

**建议补充的需求描述**:
```gherkin
Feature: 学习进度自动保存
  As a 学员
  I want 系统自动记录我的阅读位置
  So that 我可以随时继续学习而不丢失进度

  Scenario: 打开已学习过的课程
    Given 我之前学习了"Python入门"的第5章
    When 我再次访问该课程
    Then 系统应显示"继续从第5章开始学习"按钮
    And 点击后直接跳转到第5章内容
    And 左侧目录应高亮显示已读章节
```

##### 2️⃣ 课程内容编辑器增强
**现状**: 仅支持纯文本/HTML，缺少：
- [ ] Markdown实时预览
- [ ] 图片上传与图床集成
- [ ] 代码块语法高亮
- [ ] 视频/音频嵌入
- [ ] 数学公式渲染（KaTeX/MathJax）
- [ ] 内容版本历史（回滚到上一版）

**用户痛点**:
```
❌ 场景: 培训师B想插入一段代码示例
❌ 问题: 只能粘贴纯文本，无法高亮显示
❌ 期望: 类似Notion/Medium的所见即所得编辑器
```

##### 3️⃣ 批量操作能力
**现状**: 仅支持单个课程的CRUD，缺少：
- [ ] 批量发布/下架
- [ ] 批量删除（带二次确认）
- [ ] 批量修改分类/标签
- [ ] 批量导出（PDF/Word/Markdown）
- [ ] 批量导入（从Markdown文件夹）

**用户痛点**:
```
❌ 场景: 培训师C有20门课程需要从draft改为published
❌ 问题: 必须逐个点击"发布按钮"，耗时30分钟
❌ 期望: 勾选多个课程 → 一键全部发布
```

#### 🟡 P1级 - 应该补充（提升竞争力）

##### 4️⃣ 课程评价与反馈系统
```yaml
功能点:
  - 星级评分 (1-5星)
  - 文字评论（可选匿名）
  - 评论审核机制（防垃圾信息）
  - 培训师回复评论
  - 评价聚合统计（平均分、分布图）

数据模型:
  course_reviews:
    id, course_id, user_id, rating, comment
    is_anonymous, status, created_at
```

##### 5️⃣ 课程搜索与智能推荐
```yaml
当前实现:
  - 仅支持标题模糊搜索
  - 无筛选器（分类/难度/时长/更新时间）

期望实现:
  - 全文检索（标题+描述+章节内容）
  - 多维筛选（类似电商网站）
  - 搜索历史记录
  - "猜你喜欢"推荐算法
  - 热门课程排行榜
```

##### 6️⃣ 协作编辑功能（多培训师共同维护）
```yaml
场景: 企业内训部门有5位培训师维护同一门课程
需求:
  - 并发编辑冲突检测（类似Google Docs）
  - 编辑锁机制（正在编辑时其他人只读）
  - 修改日志审计（谁改了什么）
  - @提及通知（@张三 请审核第3章）
```

#### 🟢 P2级 - 可以补充（锦上添花）

##### 7️⃣ 课程模板市场
- [ ] 预设模板（新员工入职/技能认证/合规培训）
- [ ] 社区模板分享
- [ ] 一键应用模板快速建课

##### 8️⃣ 学习数据分析看板
- [ ] 实时在线人数
- [ ] 章节完读率漏斗
- [ ] 学员活跃度热力图
- [ ] 出勤率统计（结合考试系统）

##### 9️⃣ 移动端原生体验
- [ ] PWA支持（离线阅读）
- [ ] 手势操作（左滑返回、右滑下一章）
- [ ] 字体大小调节
- [ ] 夜间模式

---

## 三、现有实现的问题诊断

### 3.1 🔴 严重问题 (Must Fix)

#### 问题1: 课程列表页缺乏引导性
**文件**: [CoursesPanel.vue](../client/src/views/CoursesPanel.vue)

**现状代码片段** (L32-L50):
```vue
<template>
  <div class="courses-panel">
    <div class="panel-header">
      <h2>课程管理</h2>
      <a-button type="primary" @click="showCreateModal = true">
        <IconPlus /> 新建课程
      </a-button>
    </div>

    <!-- ❌ 问题: 无空状态处理 -->
    <!-- ❌ 问题: 无搜索无结果提示 -->
    <!-- ❌ 问题: 无快捷操作入口 -->

    <div class="courses-grid">
      <div v-for="course in courses" :key="course.id" class="course-card">
        <!-- ... -->
      </div>
    </div>
  </div>
</template>
```

**用户体验问题**:
1. **首次使用空白恐惧**: 新用户看到空白页面不知道该做什么
2. **搜索无结果死胡同**: 输入关键词后显示空白，无建议
3. **操作路径过长**: 新建课程需3步才能到达编辑器

**改进方案**:
```vue
<!-- 空状态引导 -->
<a-empty v-if="courses.length === 0 && !loading">
  <template #image>
    <IconBook />
  </template>
  <template #description>
    <p>您还没有创建任何课程</p>
    <p class="tip">创建您的第一门课程，开始知识分享之旅</p>
  </template>
  <a-button type="primary" size="large" @click="showCreateModal = true">
    立即创建课程
  </a-button>
</a-empty>

<!-- 搜索无结果 -->
<div v-if="searchKeyword && courses.length === 0" class="no-results">
  <IconSearch />
  <p>未找到包含 "{{ searchKeyword }}" 的课程</p>
  <p class="suggestions">建议:</p>
  <ul>
    <li>检查关键词拼写</li>
    <li>尝试更简短的关键词</li>
    <li><a href="#" @click="clearSearch">清除筛选条件</a></li>
  </ul>
</div>
```

---

#### 问题2: 课程编辑器体验割裂
**文件**: [CourseEditor.vue](../client/src/views/CourseEditor.vue)

**当前流程**:
```
CoursesPanel → 点击卡片 → CourseEditor（新页面）
                    ↓
              左侧: 章节树 + 右侧: 章节详情
                    ↓
              编辑内容 → 手动点击"保存"
```

**用户体验痛点**:

| 痛点 | 严重程度 | 影响 |
|------|---------|------|
| 页面跳转打断思路 | 🔴 高 | 创作流中断 |
| 无自动保存 | 🔴 高 | 误关浏览器丢失内容 |
| 章节切换慢 | 🟡 中 | 大型课程（50+章节）卡顿 |
| 无法预览效果 | 🟡 中 | 发布后发现排版错误 |
| 富文本功能弱 | 🟡 中 | 无法插入复杂内容 |

**改进方案**:
```javascript
// 1. 自动保存（每30秒或内容变更后5秒）
let autoSaveTimer = null
watch(editorContent, (newVal) => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    saveChapter(newVal) // 静默保存
    showAutoSaveIndicator('已自动保存') // 右下角toast提示
  }, 5000) // 防抖5秒
})

// 2. 离开页面提醒
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    Modal.confirm({
      title: '确定要离开吗？',
      content: '您有未保存的内容，离开后将丢失',
      okText: '离开',
      cancelText: '继续编辑'
    }).then(() => next()).catch(() => {})
  } else {
    next()
  }
})
```

---

#### 问题3: 课程学习页移动端灾难性体验
**文件**: [CourseView.vue](../client/src/views/CourseView.vue)

**桌面端布局** (L36-L84):
```html
<div class="course-layout">
  <aside class="course-toc">目录（左侧固定）</aside>
  <main class="course-content">主内容区</main>
</div>
```

**移动端问题**:
1. **左右分栏在小屏幕重叠**
2. **目录遮挡50%的内容区域**
3. **字体过小（<14px）难以阅读**
4. **按钮触摸区域<44px导致误触**

**实际截图模拟**:
```
┌─────────────────────┐
│ 📱 移动端 (375px)   │
├──────┬──────────────┤
│ 目录 │  主内容区     │ ← 目录占40%宽度！
│ 第1章│  章节标题     │
│ 第2章│  正文内容...  │
│ 第3章│  (被截断)     │
│ 第4章│              │
│ ...  │              │
└──────┴──────────────┘
```

**改进方案**:
```css
/* 移动端: 抽屉式目录 */
@media screen and (max-width: 767.98px) {
  .course-layout {
    flex-direction: column;
  }

  .course-toc {
    position: fixed;
    left: -280px; /* 默认隐藏 */
    top: 0;
    bottom: 0;
    width: 280px;
    transition: transform 0.3s ease;
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0,0,0,0.15);
  }

  .course-toc.active {
    transform: translateX(280px); /* 滑出 */
  }

  /* 触摸友好的按钮尺寸 */
  .toc-item {
    min-height: 48px; /* Apple HIG标准 */
    padding: 12px 16px;
  }
}
```

---

### 3.2 🟡 中等问题 (Should Fix)

#### 问题4: 权限管理过度技术化
**文件**: [courses.js L180-201](../server/routes/courses.js#L180-L201)

**当前API设计**:
```javascript
// POST /api/courses/:id/access
// Body: { user_ids: ["123", "456"] }
// 问题: 前端必须知道user_id，普通培训师无法使用
```

**用户心智模型 vs 系统实现**:
```
❌ 用户想法: "我想让张三和李四能看到这门课"
❌ 系统要求: 输入user_id数组 ["uid_abc123", "uid_def456"]
💡 期望: 搜索用户名 → 勾选 → 授权
```

**改进方案**:
```vue
<!-- 用户友好的授权界面 -->
<a-modal v-model:visible="showAuthModal" title="添加学员">
  <a-input-search
    v-model:value="searchUser"
    placeholder="搜索用户名/手机号"
    @search="handleSearchUser"
  />

  <!-- 搜索结果列表 -->
  <a-list :data-source="searchResults">
    <template #renderItem="{ item }">
      <a-list-item>
        <a-checkbox v-model:checked="selectedUsers[item.id]">
          {{ item.username }} ({{ item.phone }})
        </a-checkbox>
      </a-list-item>
    </template>
  </a-list>

  <!-- 已选用户标签 -->
  <div class="selected-tags">
    <a-tag v-for="uid in selectedUserIds" :key="uid" closable @close="removeUser(uid)">
      {{ getUserById(uid).username }}
    </a-tag>
  </div>
</a-modal>
```

---

#### 问题5: 缺少操作反馈与确认机制

**场景清单**:

| 操作 | 当前行为 | 期望行为 | 优先级 |
|------|---------|---------|--------|
| 删除课程 | 直接删除 | 二次确认弹窗 | P0 |
| 发布课程 | 直接发布 | 显示检查清单 | P1 |
| 取消发布 | 直接取消 | 提示"学员将无法访问" | P1 |
| 删除章节 | 直接删除 | 确认+影响说明 | P0 |
| 修改密码 | 直接保存 | 提示"已授权学员需重新输入" | P2 |

**实现示例**:
```javascript
async function handleDeleteCourse(courseId) {
  Modal.confirm({
    title: '确定要删除此课程吗？',
    content: h('div', {}, [
      h('p', '课程名称：《' + course.title + '》'),
      h('p', { style: 'color: #f53f3f' }, '⚠️ 删除后无法恢复，包括：'),
      h('ul', {}, [
        h('li', `${course.chapterCount} 个章节`),
        h('li', `${course.view_count} 次浏览记录`),
        h('li', `${course.access_count} 名已授权学员`)
      ])
    ]),
    okText: '确认删除',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      await deleteCourse(courseId)
      Message.success('课程已删除')
    }
  })
}
```

---

#### 问题6: 错误提示不够人性化

**当前错误消息** (来自API):
```json
{
  "success": false,
  "message": "ER_DUP_ENTRY: Duplicate entry 'python-intro' for key 'slug'"
}
```

**用户看到的**: ❌ 技术性错误码（完全不理解）

**应该显示**: ✅ "课程标识符'python-intro'已被使用，请更换"

**解决方案**:
参考我们刚创建的 [errorCodes.js](../server/utils/errorCodes.js)，为课程模块扩展：

```javascript
// server/utils/errorCodes.js 补充
const COURSE_ERRORS = {
  SLUG_DUPLICATE: { code: 4101, message: '课程标识符已被使用，请更换' },
  NO_CHAPTERS_TO_PUBLISH: { code: 4102, message: '发布前至少需要一个已发布的章节' },
  CHAPTER_DELETE_LAST: { code: 4103, message: '至少需要保留一个章节' },
  ACCESS_LIMIT_EXCEEDED: { code: 4104, message: '授权学员数量已达上限' },
  COURSE_LOCKED: { code: 4105, message: '该课程正在被其他管理员编辑' }
}
```

---

### 3.3 🟢 体验优化机会 (Nice to Have)

#### 优化1: 课程卡片信息密度提升
**当前卡片字段**:
- 封面图、标题、状态、更新时间

**建议增加**:
```vue
<div class="course-card-enhanced">
  <!-- 现有字段 -->
  <img :src="course.cover_url" class="cover" />
  <h3>{{ course.title }}</h3>
  <a-tag :color="statusColor">{{ statusText }}</a-tag>

  <!-- 新增字段 -->
  <div class="card-meta">
    <span><IconBook /> {{ course.chapterCount }} 章</span>
    <span><IconEye /> {{ course.view_count }} 次浏览</span>
  </div>

  <!-- 进度条（如果有学习数据） -->
  <div v-if="course.myProgress" class="progress-bar">
    <a-progress :percent="course.myProgress" :size="'small'" />
  </div>

  <!-- 快捷操作 -->
  <div class="card-actions">
    <a-button text size="small" @click.stop="preview(course)">
      <IconEye /> 预览
    </a-button>
    <a-button text size="small" @click.stop="duplicate(course)">
      <IconCopy /> 复制
    </a-button>
    <a-dropdown>
      <a-button text size="small"><IconMore /></a-button>
      <template #content>
        <a-ditem @click="exportPdf(course)">导出PDF</a-ditem>
        <a-ditem @click="share(course)">分享链接</a-ditem>
      </template>
    </a-dropdown>
  </div>
</div>
```

---

#### 优化2: 章节拖拽排序体验升级
**当前实现**: 原生HTML5 Drag & Drop（体验生硬）

**建议升级为**:
```bash
npm install vuedraggable@next  # SortableJS的Vue3封装
```

```vue
<draggable
  v-model="chapters"
  item-key="id"
  handle=".drag-handle"
  animation="200"
  ghost-class="ghost"
  @end="onDragEnd"
>
  <template #item="{ element, index }">
    <div class="chapter-item">
      <span class="drag-handle">⋮⋮</span>
      <span>{{ index + 1 }}</span>
      <span>{{ element.title }}</span>
      <a-switch v-model="element.status" checked-value="published" unchecked-value="draft" />
    </div>
  </template>
</draggable>
```

**视觉效果**:
- 拖拽时其他项目平滑让位（animation: 200ms）
- 半透明幽灵元素跟随鼠标
- 拖拽手柄清晰可见（⋮⋮ 图标）
- 实时显示新序号

---

#### 优化3: 键盘快捷键支持
**适用场景**: 课程编辑器、章节阅读页

| 快捷键 | 功能 | 所在页面 |
|--------|------|---------|
| `Ctrl+S` | 保存当前章节 | CourseEditor |
| `Ctrl+Shift+P` | 发布/取消发布 | CourseEditor |
| `←` / `→` | 上/下一章 | CourseView |
| `Esc` | 关闭弹窗/退出全屏 | 全局 |
| `/` | 聚焦搜索框 | CoursesPanel |
| `?` | 显示快捷键帮助 | 全局 |

**实现方式**:
```javascript
import { useHotkeys } from '@vueuse/core'

useHotkeys('ctrl+s', (e) => {
  e.preventDefault()
  saveCurrentChapter()
}, { scope: 'editor' })
```

---

## 四、用户旅程地图 (Customer Journey Map)

### 旅程1: 培训师创建并发布课程

```
时间轴 ──────────────────────────────────────────►

[登录]    [进入课程]   [新建]    [填写信息]  [添加章节]  [编辑内容]  [预览]   [发布]
  │         │          │         │          │          │         │        │
  ▼         ▼          ▼         ▼          ▼          ▼         ▼        ▼
满意  ★★★★★   ★★★★☆    ★★★☆☆   ★★★★☆    ★★☆☆☆    ★★☆☆☆   ★☆☆☆☆   ★★★★☆
      快速     清晰      引导弱   表单友好  操作繁琐  功能弱   缺失    流程长

痛点:
  ├─ 步骤5: 添加章节需多次点击"新建章节"
  ├─ 步骤6: 富文本编辑器难用（无法粘贴图片）
  └─ 步骤7: 无预览模式（只能发布后查看）

改进机会:
  ✨ 步骤3: 提供"快速创建"模板（一键生成大纲）
  ✨ 步骤5: 支持Markdown批量导入章节
  ✨ 步骤6: 升级为TipTap/BlockNote编辑器
  ✨ 步骤7: 添加"预览模式"tab（无需发布）
```

---

### 旅程2: 学员学习课程

```
时间轴 ──────────────────────────────────────────►

[收到链接]  [打开]    [密码验证]  [浏览目录]  [阅读]   [离开]   [再访问]
    │         │         │          │         │        │        │
    ▼         ▼         ▼          ▼         ▼        ▼        ▼
满意  ★★★★☆   ★★★☆☆    ★★★★☆    ★★☆☆☆   ★★★☆☆   ★★☆☆☆   ★☆☆☆☆
     链接清晰  加载慢   体验好    移动端差  内容好  无进度   重头开始

痛点:
  ├─ 步骤2: 首屏加载慢（封面图+章节列表同时请求）
  ├─ 步骤4: 移动端目录遮挡内容
  ├─ 步骤6: 关闭后不知道读到哪了
  └─ 步骤7: 需要手动翻找上次位置

改进机会:
  ✨ 步骤2: 骨架屏 + 渐进式加载
  ✨ 步骤4: 底部抽屉式目录（移动端）
  ✨ 步骤6: 自动保存阅读位置（localStorage/API）
  ✨ 步骤7: "继续学习"快捷入口
```

---

## 五、优化实施路线图

### Phase 1: 基础体验修复 (1周)

**目标**: 解决最影响用户的P0级问题

| 任务ID | 任务名称 | 工作量 | 优先级 | 交付物 |
|--------|---------|--------|--------|--------|
| T1.1 | 添加空状态引导组件 | 2h | P0 | EmptyState.vue |
| T1.2 | 添加搜索无结果建议 | 1h | P0 | SearchSuggestions.vue |
| T1.3 | 实现删除前二次确认 | 3h | P0 | ConfirmDialog复用 |
| T1.4 | 添加自动保存功能 | 4h | P0 | AutoSave mixin |
| T1.5 | 移动端目录改为抽屉式 | 6h | P0 | ResponsiveToc.vue |
| T1.6 | 统一课程错误码 | 2h | P0 | errorCodes.js扩展 |

**验收标准**:
- [ ] 新用户能在10秒内完成第一门课程创建
- [ ] 误删课程概率降低至接近0%
- [ ] 移动端学习体验达到"可用"级别

---

### Phase 2: 核心功能增强 (2周)

**目标**: 补齐关键业务场景

| 任务ID | 任务名称 | 工作量 | 优先级 | 交付物 |
|--------|---------|--------|--------|--------|
| T2.1 | 实现学习进度追踪API | 8h | P0 | progress.js路由 |
| T2.2 | 前端进度条与断点续学 | 6h | P0 | ProgressTracker.vue |
| T2.3 | 升级章节编辑器（Markdown） | 16h | P1 | MarkdownEditor.vue |
| T2.4 | 实现批量操作（发布/删除） | 8h | P1 | BatchActions.vue |
| T2.5 | 用户友好的授权界面 | 6h | P1 | UserPicker.vue |
| T2.6 | 添加课程预览模式 | 4h | P1 | PreviewMode.vue |

**数据库变更**:
```sql
-- 学习进度表
CREATE TABLE course_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  chapter_id INT NOT NULL,
  progress_percent DECIMAL(5,2) DEFAULT 0,
  last_position TEXT, -- 存储滚动位置或阅读百分比
  time_spent INT DEFAULT 0, -- 学习时长（秒）
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_course_chapter (user_id, course_id, chapter_id),
  INDEX idx_user_course (user_id, course_id),
  INDEX idx_updated (updated_at)
);
```

---

### Phase 3: 差异化体验 (2周)

**目标**: 打造超越竞品的亮点功能

| 任务ID | 任务名称 | 工作量 | 优先级 | 交付物 |
|--------|---------|--------|--------|--------|
| T3.1 | 课程评价系统 | 12h | P2 | ReviewSystem.vue |
| T3.2 | 智能搜索与筛选 | 10h | P2 | SmartSearch.vue |
| T3.3 | 协作编辑（基础版） | 16h | P2 | Collaboration.js |
| T3.4 | 数据统计看板 | 12h | P2 | AnalyticsDashboard.vue |
| T3.5 | PWA离线支持 | 8h | P2 | service-worker.js |
| T3.6 | 键盘快捷键系统 | 4h | P2 | HotkeysGuide.vue |

---

### Phase 4: 持续优化 (长期)

- [ ] A/B测试不同布局方案
- [ ] 用户调研（访谈/NPS调查）
- [ ] 性能监控（Core Web Vitals）
- [ ] 无障碍审计（WCAG 2.1 AA）

---

## 六、成功指标 (KPIs)

### 用户体验指标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|---------|
| **任务完成率** (创建课程) | 未知 | >85% | 埋点统计 |
| **平均完成任务时间** | 未知 | <3分钟 | 时间戳差值 |
| **错误操作率** (误删) | 未知 | <1% | 确认弹窗触发率 |
| **NPS净推荐值** | 未知 | >50 | 定期问卷 |
| **移动端跳出率** | 未知 | <40% | Google Analytics |

### 业务指标

| 指标 | 当前值 | Q2目标 | Q4目标 |
|------|--------|--------|--------|
| 月活课程数 | - | 50 | 200 |
| 人均创建课程数 | - | 2 | 5 |
| 课程平均章节数 | - | 8 | 15 |
| 学员完课率 | - | 30% | 60% |

---

## 七、风险评估与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Markdown编辑器兼容性问题 | 中 | 高 | 提供降级方案（纯文本） |
| 学习进度API性能瓶颈 | 低 | 高 | Redis缓存 + 异步写入 |
| 移动端测试覆盖不足 | 高 | 中 | 使用BrowserStack云测试 |
| 批量操作并发冲突 | 中 | 中 | 队列化处理 + 乐观锁 |
| 用户迁移成本（旧数据） | 低 | 低 | 提供数据迁移脚本 |

---

## 八、总结与行动建议

### 🎯 立即行动 (本周)

1. **修复P0问题** (预计3天):
   - 空状态引导
   - 删除确认
   - 移动端目录优化
   - 自动保存

2. **补充需求文档** (预计1天):
   - 学习进度追踪用例
   - 批量操作场景
   - 错误码映射表

### 📅 近期规划 (本月)

3. **Phase 1实施** (1周):
   - 完成所有T1.x任务
   - 内部测试验收
   - 收集早期用户反馈

4. **Phase 2启动** (第3周):
   - 学习进度追踪开发
   - 编辑器选型与技术验证

### 🚀 长期愿景 (Q2)

5. **打造差异化竞争力**:
   - 成为"培训行业最好的课程管理工具"
   - NPS > 50
   - 月活 > 500企业客户

---

## 附录

### A. 竞品对比矩阵

| 功能 | 我们 | Notion | 知识星球 | 小鹅通 |
|------|------|--------|---------|--------|
| 章节管理 | ★★★☆☆ | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| 富文本编辑 | ★★☆☆☆ | ★★★★★ | ★★★☆☆ | ★★★☆☆ |
| 学习进度 | ☆☆☆☆☆ | ☆☆☆☆☆ | ★★★☆☆ | ★★★★☆ |
| 移动端体验 | ★★☆☆☆ | ★★★★☆ | ★★★★☆ | ★★★★★ |
| 权限管理 | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | ★★★★☆ |
| 数据分析 | ☆☆☆☆☆ | ★★★☆☆ | ★★★★☆ | ★★★★★ |

### B. 用户调研问题模板

```
1. 您通常多久创建一门新课程？
2. 创建过程中最让您沮丧的环节是什么？
3. 您会使用移动端查看/编辑课程吗？
4. 您希望学员能够做什么？（评价/提问/下载）
5. 如果能给课程管理打分（1-10），您打几分？为什么？
```

### C. 技术选型建议

| 组件 | 推荐方案 | 备选方案 | 理由 |
|------|---------|---------|------|
| 富文本编辑器 | TipTap | BlockNote | Vue3生态好/可扩展 |
| 拖拽排序 | vuedraggable | dnd-kit | 成熟稳定/文档完善 |
| Markdown解析 | marked + highlight.js | remarkable | 性能好/插件丰富 |
| 图床上传 | 自建OSS | Cloudinary | 成本可控/隐私安全 |
| 数据图表 | ECharts | Chart.js | 中文文档/功能强大 |

---

**文档版本**: v1.0
**最后更新**: 2026-04-23
**负责人**: AI Code Reviewer
**审批状态**: 待批准
