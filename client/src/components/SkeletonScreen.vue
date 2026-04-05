<template>
  <!-- 仪表盘骨架屏 -->
  <div v-if="type === 'dashboard'" class="skeleton-dashboard">
    <div class="skeleton-sidebar">
      <div class="skeleton-logo">
        <a-skeleton-shape shape="circle" size="small" />
        <a-skeleton-line :width="120" :height="20" />
      </div>
      <div class="skeleton-menu">
        <a-skeleton-line v-for="i in 6" :key="i" :width="140" :height="16" />
      </div>
    </div>
    <div class="skeleton-main">
      <div class="skeleton-header">
        <a-skeleton-line :width="200" :height="24" />
      </div>
      <div class="skeleton-content">
        <div class="skeleton-toolbar">
          <a-skeleton-shape shape="button" :width="100" :height="32" />
          <a-skeleton-shape shape="button" :width="100" :height="32" />
        </div>
        <div class="skeleton-table">
          <div v-for="i in 8" :key="i" class="skeleton-row">
            <a-skeleton-line :width="60" :height="16" />
            <a-skeleton-line :width="200" :height="16" />
            <a-skeleton-line :width="80" :height="16" />
            <a-skeleton-line :width="80" :height="16" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 列表页骨架屏 -->
  <div v-else-if="type === 'list'" class="skeleton-list">
    <div class="skeleton-toolbar">
      <a-skeleton-shape shape="button" :width="100" :height="32" />
      <a-skeleton-shape shape="button" :width="100" :height="32" />
      <a-skeleton-line :width="200" :height="32" style="margin-left: auto" />
    </div>
    <div class="skeleton-table">
      <div class="skeleton-header-row">
        <a-skeleton-line v-for="i in columns" :key="i" :width="100" :height="20" />
      </div>
      <div v-for="i in rows" :key="i" class="skeleton-row">
        <a-skeleton-line v-for="j in columns" :key="j" :width="80 + Math.random() * 80" :height="16" />
      </div>
    </div>
  </div>

  <!-- 卡片列表骨架屏 -->
  <div v-else-if="type === 'card'" class="skeleton-card-list">
    <div v-for="i in count" :key="i" class="skeleton-card-item">
      <a-skeleton-shape shape="square" size="large" />
      <a-skeleton-line :width="150" :height="20" />
      <a-skeleton-line :width="100" :height="16" />
    </div>
  </div>

  <!-- 详情页骨架屏 -->
  <div v-else-if="type === 'detail'" class="skeleton-detail">
    <div class="skeleton-header">
      <a-skeleton-line :width="300" :height="32" />
      <a-skeleton-line :width="200" :height="16" />
    </div>
    <div class="skeleton-body">
      <div v-for="i in 6" :key="i" class="skeleton-field">
        <a-skeleton-line :width="100" :height="16" />
        <a-skeleton-line :width="" :height="20" />
      </div>
    </div>
  </div>

  <!-- 通用骨架屏 -->
  <div v-else class="skeleton-generic">
    <a-skeleton :animation="animation">
      <template #content>
        <div class="skeleton-content-wrapper">
          <a-skeleton-line v-for="i in lines" :key="i" :width="widths[i % widths.length]" :height="16" />
        </div>
      </template>
    </a-skeleton>
  </div>
</template>

<script>
export default {
  name: 'SkeletonScreen',
  props: {
    type: {
      type: String,
      default: 'generic',
      validator: (value) => ['dashboard', 'list', 'card', 'detail', 'generic'].includes(value)
    },
    rows: {
      type: Number,
      default: 5
    },
    columns: {
      type: Number,
      default: 4
    },
    count: {
      type: Number,
      default: 6
    },
    lines: {
      type: Number,
      default: 5
    },
    animation: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const widths = [200, 150, 180, 120, 250, 160]
    return { widths }
  }
}
</script>

<style scoped>
/* 仪表盘骨架屏 */
.skeleton-dashboard {
  display: flex;
  height: 100vh;
  background: var(--bg-color);
}

.skeleton-sidebar {
  width: 240px;
  background: var(--bg-color-white);
  padding: 20px;
  border-right: 1px solid var(--border-color);
}

.skeleton-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.skeleton-menu {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-header {
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color-white);
}

.skeleton-content {
  flex: 1;
  padding: 24px;
}

.skeleton-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

/* 列表骨架屏 */
.skeleton-list {
  padding: 24px;
}

.skeleton-table {
  background: var(--bg-color-white);
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.skeleton-header-row {
  display: grid;
  grid-template-columns: repeat(v-bind(columns), 1fr);
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.skeleton-row {
  display: grid;
  grid-template-columns: repeat(v-bind(columns), 1fr);
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color-light);
}

.skeleton-row:last-child {
  border-bottom: none;
}

/* 卡片列表骨架屏 */
.skeleton-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 24px;
}

.skeleton-card-item {
  background: var(--bg-color-white);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-card);
}

/* 详情页骨架屏 */
.skeleton-detail {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.skeleton-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

/* 通用骨架屏 */
.skeleton-generic {
  padding: 24px;
}

.skeleton-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .skeleton-sidebar {
    display: none;
  }
  
  .skeleton-card-list {
    grid-template-columns: 1fr;
  }
}
</style>
