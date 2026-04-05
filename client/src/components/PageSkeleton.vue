<template>
  <!-- 页面加载骨架屏 -->
  <div class="page-skeleton" v-if="loading">
    <!-- 顶部导航骨架 -->
    <div class="skeleton-header" v-if="showHeader">
      <a-skeleton :animation="animation">
        <a-space direction="vertical" :style="{ width: '100%' }" size="large">
          <a-skeleton-line :rows="1" :widths="['200px']" />
        </a-space>
      </a-skeleton>
    </div>

    <!-- 工具栏骨架 -->
    <div class="skeleton-toolbar" v-if="showToolbar">
      <a-skeleton :animation="animation">
        <a-space>
          <a-skeleton-shape shape="button" size="small" />
          <a-skeleton-shape shape="button" size="small" />
          <a-skeleton-line :rows="1" :widths="['200px']" />
        </a-space>
      </a-skeleton>
    </div>

    <!-- 表格骨架 -->
    <div class="skeleton-table" v-if="type === 'table'">
      <a-skeleton :animation="animation">
        <a-space direction="vertical" :style="{ width: '100%' }" size="medium">
          <!-- 表头 -->
          <a-space :style="{ width: '100%', marginBottom: '16px' }">
            <a-skeleton-line v-for="i in columns" :key="i" :rows="1" :widths="['100px']" />
          </a-space>
          <!-- 表格行 -->
          <div v-for="row in rows" :key="row" class="skeleton-table-row">
            <a-space>
              <a-skeleton-line v-for="col in columns" :key="col" :rows="1" :widths="[80 + Math.random() * 60 + 'px']" />
            </a-space>
          </div>
        </a-space>
      </a-skeleton>
    </div>

    <!-- 卡片列表骨架 -->
    <div class="skeleton-cards" v-else-if="type === 'cards'">
      <a-row :gutter="[24, 24]">
        <a-col :span="8" v-for="i in count" :key="i">
          <a-skeleton :animation="animation">
            <a-space direction="vertical" :style="{ width: '100%' }">
              <a-skeleton-shape shape="square" size="large" :style="{ width: '100%', height: '120px' }" />
              <a-skeleton-line :rows="2" />
            </a-space>
          </a-skeleton>
        </a-col>
      </a-row>
    </div>

    <!-- 表单骨架 -->
    <div class="skeleton-form" v-else-if="type === 'form'">
      <a-skeleton :animation="animation">
        <a-space direction="vertical" :style="{ width: '100%' }" size="large">
          <div v-for="i in rows" :key="i" class="skeleton-form-item">
            <a-skeleton-line :rows="1" :widths="['100px']" />
            <a-skeleton-line :rows="1" :widths="['100%']" />
          </div>
        </a-space>
      </a-skeleton>
    </div>

    <!-- 通用骨架 -->
    <div class="skeleton-generic" v-else>
      <a-skeleton :animation="animation">
        <a-space direction="vertical" :style="{ width: '100%' }" size="medium">
          <a-skeleton-line :rows="rows" />
        </a-space>
      </a-skeleton>
    </div>
  </div>

  <!-- 实际内容 -->
  <div v-else class="page-content">
    <slot />
  </div>
</template>

<script>
export default {
  name: 'PageSkeleton',
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'generic',
      validator: (value) => ['table', 'cards', 'form', 'generic'].includes(value)
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
    showHeader: {
      type: Boolean,
      default: true
    },
    showToolbar: {
      type: Boolean,
      default: true
    },
    animation: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style scoped>
.page-skeleton {
  padding: 24px;
  background: var(--bg-color);
  min-height: 100%;
}

.skeleton-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.skeleton-toolbar {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-color-white);
  border-radius: 8px;
}

.skeleton-table {
  background: var(--bg-color-white);
  border-radius: 8px;
  padding: 24px;
}

.skeleton-table-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color-light);
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

.skeleton-cards {
  margin-top: 24px;
}

.skeleton-form {
  max-width: 600px;
  margin: 0 auto;
  background: var(--bg-color-white);
  padding: 32px;
  border-radius: 8px;
}

.skeleton-form-item {
  margin-bottom: 24px;
}

.page-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .page-skeleton {
    padding: 16px;
  }

  .skeleton-form {
    padding: 20px;
  }
}
</style>
