# 项目样式系统说明

## 文件结构

```
styles/
├── variables.css    # 设计令牌和组件样式
├── utilities.css    # 原子化工具类
└── README.md        # 本文档
```

## 使用说明

### 1. 设计令牌 (variables.css)

包含项目通用的 CSS 变量和组件样式类。

**CSS 变量:**
```css
/* 主色调 */
--color-primary: #165dff;
--color-success: #00b42a;
--color-warning: #ff7d00;
--color-danger: #f53f3f;

/* 文字颜色 */
--text-primary: var(--color-text-1);
--text-regular: var(--color-text-2);
--text-secondary: var(--color-text-3);

/* 背景/边框 */
--bg-color: var(--color-fill-1);
--border-color: var(--color-neutral-3);
```

**通用组件类:**

| 类名 | 说明 |
|------|------|
| `.tag` `.tag-primary` `.tag-success` | 标签样式 |
| `.btn` `.btn-primary` `.btn-danger` | 按钮样式 |
| `.data-table` | 数据表格 |
| `.card` `.stat-card` | 卡片样式 |
| `.page-header` `.page-title` | 页面头部 |
| `.toolbar` `.toolbar-left` `.toolbar-right` | 工具栏 |
| `.pagination` | 分页组件 |
| `.rank-badge` `.score-tag` `.score-badge` | 排名/分数标签 |
| `.form-tip` | 表单提示文字 |
| `.password-strength` `.strength-bar` `.strength-fill` | 密码强度指示器 |

### 2. 工具类 (utilities.css)

原子化 CSS 工具类，用于快速布局。

**布局:**
```css
.flex .flex-col .flex-row .flex-1
.justify-center .justify-between
.items-center .items-start
.grid .grid-cols-2 .grid-cols-4
.gap-8 .gap-12 .gap-16
```

**间距:**
```css
.m-8 .m-12 .m-16        /* margin */
.mt-8 .mb-8 .ml-8       /* 单边 margin */
.p-8 .p-12 .p-16        /* padding */
.px-16 .py-12           /* 双边 padding */
```

**尺寸:**
```css
.w-full .h-full
.max-w-900 .max-w-1200
.min-h-screen
```

**文字:**
```css
.text-xs .text-sm .text-lg .text-xl
.font-medium .font-semibold .font-bold
.text-primary .text-secondary .text-danger
.text-center .text-left .text-right
.truncate .line-clamp-2
```

**颜色/背景:**
```css
.bg-white .bg-base .bg-hover
.text-primary .text-regular .text-secondary
.text-danger .text-warning .text-success
```

**边框/阴影:**
```css
.rounded-sm .rounded-base .rounded-lg
.border .border-light .border-b
.shadow-sm .shadow-base .shadow-md
```

**响应式:**
```css
.hide-xs .hide-sm .hide-md .hide-lg .hide-xl
```

### 3. 在 Vue 组件中使用

**使用全局组件类:**
```vue
<template>
  <!-- 标签 -->
  <span class="tag tag-primary">重要</span>
  <span class="tag tag-success">成功</span>

  <!-- 按钮 -->
  <button class="btn btn-primary">保存</button>
  <button class="btn btn-danger">删除</button>

  <!-- 工具栏 -->
  <div class="toolbar">
    <div class="toolbar-left">
      <a-button type="primary">新增</a-button>
    </div>
    <div class="toolbar-right">
      <a-input placeholder="搜索" />
    </div>
  </div>

  <!-- 表格 -->
  <table class="data-table">
    <!-- ... -->
  </table>

  <!-- 使用工具类快速布局 -->
  <div class="flex justify-between items-center gap-12">
    <div class="text-lg font-semibold">标题</div>
    <a-button type="primary">操作</a-button>
  </div>
</template>
```

## 最佳实践

1. **优先使用工具类**: 简单的布局和间距使用 utilities.css 中的原子类
2. **复用组件类**: 标签、按钮、表格等使用 variables.css 中的组件类
3. **避免重复定义**: 不要在组件中重复定义全局已提供的样式
4. **遵循命名规范**: 新添加的类名使用 kebab-case，保持与现有代码一致
5. **响应式设计**: 使用 `.hide-*` 类控制不同屏幕尺寸的显示/隐藏

## 样式加载顺序

在 `main.js` 中按以下顺序加载:

```javascript
import '@arco-design/web-vue/dist/arco.css'  // 1. Arco Design 基础样式
import './styles/variables.css'               // 2. 项目变量和组件样式
import './styles/utilities.css'               // 3. 工具类 (最后加载，优先级最高)
```

## 注意事项

1. 工具类使用 `!important` 确保优先级，适合快速布局但不适合复杂样式
2. 组件内的 scoped 样式优先级高于全局样式，如需覆盖可使用 `:deep()`
3. 新增全局样式时请考虑现有组件的兼容性
