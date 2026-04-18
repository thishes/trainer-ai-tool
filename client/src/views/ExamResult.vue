<template>
  <div class="result-page">
    <a-card class="result-card">
      <!-- 成绩状态图标 -->
      <div class="result-header">
        <div class="result-icon" :class="scoreClass">
          <svg v-if="scoreClass === 'excellent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <svg v-else-if="scoreClass === 'fail'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 15h8M9 9h.01M15 9h.01"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>
        <h1>考试成绩</h1>
        <a-tag :color="scoreTagColor" size="large" class="score-badge">
          {{ scoreText }}
        </a-tag>
      </div>

      <div v-if="loading" class="loading">
        <a-spin size="large" />
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <a-result status="error" :title="error">
          <template #extra>
            <a-button type="primary" @click="loadResult">重新加载</a-button>
            <a-button @click="$router.push('/')">返回首页</a-button>
          </template>
        </a-result>
      </div>

      <div v-else-if="result" class="result-content">
        <!-- 成绩概览卡片 -->
        <div class="score-overview">
          <!-- 总分卡片 -->
          <div class="score-card total" :class="scoreClass">
            <div class="score-card-label">总分</div>
            <div class="score-card-value">
              <template v-if="hasEssayQuestions && result.score === null">
                <span class="pending-text">--</span>
              </template>
              <template v-else>
                {{ displayScore }}
              </template>
            </div>
            <div class="score-card-unit">分</div>
          </div>

          <!-- 客观题卡片 -->
          <div class="score-card objective">
            <div class="score-card-label">客观题</div>
            <div class="score-card-value">{{ result.objective_score || 0 }}</div>
            <div class="score-card-unit">/{{ result.objective_total || 0 }}分</div>
          </div>

          <!-- 问答题卡片 -->
          <div class="score-card essay" v-if="hasEssayQuestions">
            <div class="score-card-label">问答题</div>
            <div class="score-card-value">
              <template v-if="result.score === null">
                <a-tag color="orange" size="small">待批改</a-tag>
              </template>
              <template v-else>
                {{ essayScore }}
              </template>
            </div>
            <div class="score-card-unit" v-if="result.score !== null">/{{ essayTotal }}分</div>
          </div>
        </div>

        <!-- 问答题提示 -->
        <div v-if="hasEssayQuestions && result.score === null" class="essay-notice">
          <icon-info-circle />
          <span>问答题待老师批改后显示总分</span>
        </div>

        <!-- 答题统计 -->
        <div class="stats-section">
          <div class="stats-title">答题统计</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ result.total_questions || 0 }}</div>
              <div class="stat-label">总题数</div>
            </div>
            <div class="stat-item correct">
              <div class="stat-value">{{ result.correct_count || 0 }}</div>
              <div class="stat-label">答对</div>
            </div>
            <div class="stat-item wrong">
              <div class="stat-value">{{ result.wrong_count || 0 }}</div>
              <div class="stat-label">答错</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ formatDuration(result.duration) }}</div>
              <div class="stat-label">用时</div>
            </div>
            <div class="stat-item" v-if="result.rank">
              <div class="stat-value">第{{ result.rank }}名</div>
              <div class="stat-label">排名</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ result.percentage || 0 }}%</div>
              <div class="stat-label">得分率</div>
            </div>
          </div>
        </div>

        <!-- 分数分布对比 -->
        <div class="distribution-section" v-if="result.distribution">
          <div class="section-title">分数分布</div>
          <div class="distribution-bars">
            <div v-for="d in result.distribution" :key="d.range" class="dist-item">
              <div class="dist-label">{{ d.range }}</div>
              <div class="dist-bar-wrapper">
                <div class="dist-bar" :style="{ width: getDistributionWidth(d.count), backgroundColor: getDistColor(d.range) }"></div>
              </div>
              <div class="dist-count">{{ d.count }}人</div>
            </div>
          </div>
          <div class="my-position" v-if="result.rank">
            您在 {{ result.total_examinees || 0 }} 人中排名第 <strong>{{ result.rank }}</strong> 位
          </div>
        </div>

        <a-divider />

        <!-- 考试信息 -->
        <div class="exam-info">
          <div class="info-title">考试信息</div>
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="试卷名称">{{ result.title }}</a-descriptions-item>
            <a-descriptions-item label="考试时间">{{ formatDateTime(result.start_time) }}</a-descriptions-item>
            <a-descriptions-item label="交卷时间">{{ formatDateTime(result.end_time) }}</a-descriptions-item>
            <a-descriptions-item v-if="result.student_name" label="考生姓名">{{ result.student_name }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <a-button type="primary" @click="$router.push('/')">
            <template #icon><icon-home /></template>
            返回首页
          </a-button>
        </div>
      </div>
    </a-card>

    <div class="footer">
      <span>© thishe.com</span>
      <span style="margin-left: 12px; opacity: 0.6;">v{{ APP_VERSION }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamResult } from '@/api'
import { formatDateTime } from '@/utils/date'
import { EXAM_CONFIG } from '@/config/constants'
import { APP_VERSION } from '@/version'

export default {
  name: 'ExamResult',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const result = ref(null)
    const loading = ref(true)
    const error = ref(null)

    const loadResult = async () => {
      loading.value = true
      error.value = null
      try {
        const examId = route.params.id
        if (!examId) {
          error.value = '缺少考试记录ID'
          return
        }
        const studentName = route.query.student_name
        const params = studentName ? { student_name: studentName } : {}
        const res = await getExamResult(examId, { params })
        result.value = res.data
      } catch (e) {
        console.error('加载考试结果失败:', e)
        error.value = e.response?.data?.message || e.message || '加载结果失败，请稍后重试'
      } finally {
        loading.value = false
      }
    }

    // 计算显示分数
    const displayScore = computed(() => {
      if (!result.value) return 0
      if (result.value.score !== null && result.value.score !== undefined) {
        return result.value.score
      }
      return result.value.objective_score || 0
    })

    // 计算问答题分数（直接使用后端返回的字段）
    const essayScore = computed(() => {
      if (!result.value || result.value.score === null) return 0
      return result.value.essay_score || 0
    })

    // 问答题总分（直接使用后端返回的字段）
    const essayTotal = computed(() => {
      if (!result.value) return 0
      return result.value.essay_total || 0
    })

    // 分数等级样式
    const scoreClass = computed(() => {
      const score = displayScore.value
      if (score >= 90) return 'excellent'
      if (score >= 70) return 'good'
      if (score >= 60) return 'pass'
      return 'fail'
    })

    // 标签颜色
    const scoreTagColor = computed(() => {
      const score = displayScore.value
      if (score >= 90) return 'green'
      if (score >= 70) return 'arcoblue'
      if (score >= 60) return 'orange'
      return 'red'
    })

    // 等级文字
    const scoreText = computed(() => {
      const score = displayScore.value
      if (hasEssayQuestions.value && result.value?.score === null) {
        return '待批改'
      }
      if (score >= 90) return '优秀'
      if (score >= 70) return '良好'
      if (score >= EXAM_CONFIG.PASS_SCORE) return '及格'
      return '不及格'
    })

    // 判断是否包含问答题
    const hasEssayQuestions = computed(() => {
      if (!result.value) return false
      // 优先使用后端返回的 has_essay_questions 字段（包括 false 值）
      if (result.value.has_essay_questions !== undefined && result.value.has_essay_questions !== null) {
        return result.value.has_essay_questions
      }
      // 兼容旧数据
      if (result.value.objective_score === null) return true
      if (result.value.score !== null && result.value.score !== result.value.objective_score) return true
      return false
    })

    // 格式化时长
    const formatDuration = (seconds) => {
      if (!seconds) return '--'
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      if (mins > 0) {
        return `${mins}分${secs}秒`
      }
      return `${secs}秒`
    }

    // 获取分布宽度
    const getDistributionWidth = (count) => {
      if (!result.value?.total_examinees) return '0%'
      return `${(count / result.value.total_examinees * 100)}%`
    }

    // 获取分布颜色
    const getDistColor = (range) => {
      if (range === '90-100') return '#00b42a'
      if (range === '80-89') return '#165dff'
      if (range === '70-79') return '#ff7d00'
      if (range === '60-69') return '#ff9a2e'
      return '#f53f3f'
    }

    onMounted(() => {
      loadResult()
    })

    return {
      result,
      loading,
      error,
      loadResult,
      displayScore,
      essayScore,
      essayTotal,
      scoreClass,
      scoreTagColor,
      scoreText,
      hasEssayQuestions,
      formatDateTime,
      formatDuration,
      getDistributionWidth,
      getDistColor
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }

.result-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: var(--bg-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 40px 20px;
}

.result-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-dropdown);
  max-width: 600px;
  width: 100%;
  padding: 32px;
}

:deep(.arco-card) {
  border: none;
  background: var(--bg-color-white);
}

/* 头部区域 */
.result-header {
  text-align: center;
  margin-bottom: 24px;
}

.result-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  background: var(--color-primary);
}

.result-icon.excellent { background: linear-gradient(135deg, #00b42a, #00d68a); }
.result-icon.good { background: linear-gradient(135deg, #165dff, #4d8aff); }
.result-icon.pass { background: linear-gradient(135deg, #ff7d00, #ff9a2e); }
.result-icon.fail { background: linear-gradient(135deg, #f53f3f, #ff7d7d); }

.result-icon svg {
  width: 32px;
  height: 32px;
  color: white;
}

.result-header h1 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.score-badge {
  font-size: 14px;
  padding: 4px 16px;
}

/* 成绩概览卡片 */
.score-overview {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
}

.score-card {
  flex: 1;
  min-width: 100px;
  padding: 16px 12px;
  border-radius: var(--radius-base);
  text-align: center;
  background: var(--bg-color);
  transition: all 0.3s ease;
}

.score-card.total {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: white;
}

.score-card.total.excellent { background: linear-gradient(135deg, #00b42a, #00d68a); }
.score-card.total.good { background: linear-gradient(135deg, #165dff, #4d8aff); }
.score-card.total.pass { background: linear-gradient(135deg, #ff7d00, #ff9a2e); }
.score-card.total.fail { background: linear-gradient(135deg, #f53f3f, #ff7d7d); }

.score-card-label {
  font-size: 12px;
  margin-bottom: 8px;
  opacity: 0.9;
}

.score-card-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.score-card-unit {
  font-size: 12px;
  opacity: 0.8;
}

.pending-text {
  font-size: 20px;
  opacity: 0.7;
}

/* 问答题提示 */
.essay-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--color-warning-light);
  border-radius: var(--radius-base);
  color: var(--color-warning);
  font-size: 13px;
  margin-bottom: 20px;
}

/* 答题统计 */
.stats-section {
  margin-bottom: 24px;
}

.stats-title, .section-title, .info-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: var(--bg-color);
  border-radius: var(--radius-base);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-item.correct .stat-value { color: var(--color-success); }
.stat-item.wrong .stat-value { color: var(--color-danger); }

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 分数分布 */
.distribution-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-color);
  border-radius: var(--radius-base);
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dist-label {
  width: 50px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

.dist-bar-wrapper {
  flex: 1;
  height: 8px;
  background: var(--bg-color-white);
  border-radius: 4px;
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.dist-count {
  width: 50px;
  font-size: 12px;
  color: var(--text-regular);
  text-align: right;
}

.my-position {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.my-position strong {
  color: var(--color-primary);
  font-size: 16px;
}

/* 考试信息 */
.exam-info {
  margin-bottom: 24px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-buttons :deep(.arco-btn) {
  min-width: 120px;
}

/* 加载状态 */
.loading {
  padding: 60px 0;
  text-align: center;
}

.loading p {
  margin-top: 16px;
  color: var(--text-secondary);
}

/* 错误状态 */
.error-state {
  padding: 40px 0;
}

.result-page .footer {
  text-align: center;
  padding: 20px 16px;
  color: var(--text-secondary, #86909c);
  font-size: 13px;
  border-top: 1px solid var(--border-color-light, #e5e6eb);
  margin-top: 40px;
}

/* 响应式 */
@media screen and (max-width: 480px) {
  .result-page {
    padding: 20px 12px;
  }

  .result-card {
    padding: 20px 16px;
  }

  .result-header h1 {
    font-size: 20px;
  }

  .score-overview {
    flex-wrap: wrap;
  }

  .score-card {
    min-width: calc(50% - 6px);
  }

  .score-card-value {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
