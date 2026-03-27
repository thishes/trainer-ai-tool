<template>
  <div class="result-page">
    <a-card class="result-card">
      <div class="result-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </div>
      <h1>考试成绩</h1>
      <div v-if="result" class="result-content">
        <a-statistic :value="result.score" :precision="0" title="最终得分" :class="scoreClass">
          <template #suffix>分</template>
        </a-statistic>
        <a-tag :color="scoreTagColor" size="large" style="margin-top: 12px; padding: 4px 20px; font-size: 14px">
          {{ scoreText }}
        </a-tag>
        <a-divider />
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="试卷名称">{{ result.title }}</a-descriptions-item>
          <a-descriptions-item label="考试时间">{{ formatTime(result.start_time) }}</a-descriptions-item>
          <a-descriptions-item label="交卷时间">{{ formatTime(result.end_time) }}</a-descriptions-item>
          <a-descriptions-item v-if="result.student_name" label="考生姓名">{{ result.student_name }}</a-descriptions-item>
        </a-descriptions>
        <a-button type="primary" style="margin-top: 24px; width: 100%" @click="$router.push('/')">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </template>
          返回首页
        </a-button>
      </div>
      <div v-else class="loading">
        <a-spin size="large" />
        <p style="margin-top: 16px; color: var(--text-secondary)">加载中...</p>
      </div>
    </a-card>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamResult } from '@/api'

export default {
  name: 'ExamResult',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const result = ref(null)

    const formatTime = (time) => {
      if (!time) return '-'
      return new Date(time).toLocaleString('zh-CN')
    }

    const scoreClass = computed(() => {
      if (!result.value) return ''
      const score = result.value.score
      if (score >= 90) return 'excellent'
      if (score >= 70) return 'good'
      if (score >= 60) return 'pass'
      return 'fail'
    })

    const scoreTagColor = computed(() => {
      if (!result.value) return 'default'
      const score = result.value.score
      if (score >= 90) return 'green'
      if (score >= 70) return 'arcoblue'
      if (score >= 60) return 'orange'
      return 'red'
    })

    const scoreText = computed(() => {
      if (!result.value) return ''
      const score = result.value.score
      if (score >= 90) return '优秀'
      if (score >= 70) return '良好'
      if (score >= 60) return '及格'
      return '不及格'
    })

    onMounted(async () => {
      if (route.query.data) {
        try {
          result.value = JSON.parse(route.query.data)
        } catch (e) {
          console.error(e)
        }
      }

      if (!result.value && route.params.id) {
        try {
          const res = await getExamResult(route.params.id)
          result.value = res.data
        } catch (e) {
          console.error(e)
        }
      }
    })

    return { result, formatTime, scoreClass, scoreTagColor, scoreText }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.result-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 20px;
}
.result-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-dropdown);
  max-width: 420px;
  width: 100%;
  text-align: center;
  padding: 36px;
}
:deep(.arco-card) {
  border: none;
  background: var(--bg-color-white);
}
.result-icon {
  width: 56px;
  height: 56px;
  background: var(--color-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.result-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}
.result-card h1 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}
:deep(.arco-statistic) {
  padding: 20px 0;
}
:deep(.arco-statistic .arco-statistic-value) {
  font-size: 48px;
  font-weight: 600;
  color: var(--color-primary);
}
:deep(.arco-statistic.excellent .arco-statistic-value) {
  color: var(--color-success);
}
:deep(.arco-statistic.good .arco-statistic-value) {
  color: var(--color-primary);
}
:deep(.arco-statistic.pass .arco-statistic-value) {
  color: var(--color-warning);
}
:deep(.arco-statistic.fail .arco-statistic-value) {
  color: var(--color-danger);
}
:deep(.arco-descriptions) {
  margin-top: 16px;
}
:deep(.arco-descriptions-item-label) {
  color: var(--text-secondary);
  width: 100px;
}
:deep(.arco-descriptions-item-value) {
  color: var(--text-primary);
}
:deep(.arco-divider) {
  margin: 16px 0;
}
.loading {
  padding: 40px 0;
  text-align: center;
}

@media screen and (max-width: 480px) {
  .result-card {
    padding: 24px 16px;
  }

  .result-card h1 {
    font-size: 18px;
  }

  :deep(.arco-statistic .arco-statistic-value) {
    font-size: 36px;
  }

  .result-icon {
    width: 48px;
    height: 48px;
  }

  .result-icon svg {
    width: 24px;
    height: 24px;
  }
}
</style>