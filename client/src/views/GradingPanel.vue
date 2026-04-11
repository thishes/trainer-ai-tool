<template>
  <div class="page-view">
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">待评分</h1>
          <p class="page-desc">对包含问答题的试卷进行手工评分，共 <span class="highlight">{{ pendingGradingCount }}</span> 份待处理</p>
        </div>
      </div>
    </div>
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-input v-model="pendingGradingSearch" placeholder="搜索考生姓名" style="width: 240px" @input="filterPendingGrading" allow-clear>
          <template #prefix><icon-search /></template>
        </a-input>
        <a-select v-model="pendingGradingPaperFilter" placeholder="选择试卷" style="width: 200px" @change="filterPendingGrading" allow-clear>
          <a-option v-for="p in papers" :key="p.id" :value="p.id">{{ p.title }}</a-option>
        </a-select>
        <a-button @click="resetPendingGradingFilter" v-if="pendingGradingSearch || pendingGradingPaperFilter">
          <template #icon><icon-refresh /></template>
          重置
        </a-button>
      </div>
    </div>
    <a-card class="content-card">
      <table class="data-table">
        <thead>
          <tr>
            <th width="120">考生姓名</th>
            <th>试卷</th>
            <th width="100">客观题</th>
            <th width="100">问答题</th>
            <th width="160">提交时间</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in filteredPendingGradingList" :key="record.id">
            <td>
              <div style="display: flex; align-items: center;">
                <a-avatar :size="32" :style="{ backgroundColor: getStudentAvatarColor(record.student_name) }" style="margin-right: 12px">
                  {{ record.student_name?.charAt(0) }}
                </a-avatar>
                <span style="color: var(--color-primary); font-weight: 500;">{{ record.student_name }}</span>
              </div>
            </td>
            <td>{{ record.paper_title }}</td>
            <td>
              <span v-if="record.objective_score !== null && record.objective_total !== null">
                {{ record.objective_score }}/{{ record.objective_total }}
              </span>
              <span v-else>-</span>
            </td>
            <td>
              <a-tag v-if="record.essay_questions && record.essay_questions.length > 0" color="arcoblue" size="small">
                {{ record.essay_questions.length }} 道题
              </a-tag>
              <span v-else>-</span>
            </td>
            <td>
              <span style="color: var(--text-secondary); font-size: 13px;">
                <icon-clock-circle style="margin-right: 6px; opacity: 0.6; width: 14px; height: 14px;" />
                {{ formatDateTime(record.end_time) }}
              </span>
            </td>
            <td>
              <a-button type="primary" size="small" @click="openGradingDrawer(record)">
                评阅
              </a-button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredPendingGradingList.length > 0" class="pagination">
        <a-select v-model="pendingGradingPageSize" style="width: 80px" @change="pendingGradingPage = 1">
          <a-option :value="8">8 条</a-option>
          <a-option :value="10">10 条</a-option>
          <a-option :value="15">15 条</a-option>
          <a-option :value="20">20 条</a-option>
        </a-select>
        <span class="page-btn" @click="pendingGradingPage = 1">首页</span>
        <span class="page-btn" @click="pendingGradingPage > 1 && pendingGradingPage--">上一页</span>
        <span class="page-current">{{ pendingGradingPage }} / {{ Math.ceil(filteredPendingGradingList.length / pendingGradingPageSize) }}</span>
        <span class="page-btn" @click="pendingGradingPage < Math.ceil(filteredPendingGradingList.length / pendingGradingPageSize) && pendingGradingPage++">下一页</span>
        <span class="page-btn" @click="pendingGradingPage = Math.ceil(filteredPendingGradingList.length / pendingGradingPageSize)">末页</span>
      </div>
    </a-card>

    <!-- 评分抽屉 -->
    <a-drawer v-model:visible="showGradingDrawer" :title="'评卷 - ' + (currentGradingRecord?.student_name || '') + ' - ' + (currentGradingRecord?.paper_title || '')" :width="800" :footer="false">
      <div v-if="currentGradingRecord" class="grading-drawer-content">
        <div class="grading-drawer-header">
          <div class="header-info">
            <a-avatar :size="48" :style="{ backgroundColor: '#165DFF' }">
              {{ currentGradingRecord.student_name?.charAt(0) }}
            </a-avatar>
            <div class="header-meta">
              <div class="meta-row">
                <span class="meta-label">考生：</span>
                <span class="meta-value">{{ currentGradingRecord.student_name }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">试卷：</span>
                <span class="meta-value">{{ currentGradingRecord.paper_title }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">提交时间：</span>
                <span class="meta-value">{{ formatDateTime(currentGradingRecord.end_time) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">客观题得分：</span>
                <span class="meta-value score-highlight">
                  <template v-if="currentGradingRecord.objective_total !== null && currentGradingRecord.objective_total !== 0">
                    {{ currentGradingRecord.objective_score !== null ? currentGradingRecord.objective_score + '/' + currentGradingRecord.objective_total + '分' : '未评分' }}
                  </template>
                  <template v-else>
                    无客观题
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <a-divider style="margin: 16px 0" />
        
        <div class="grading-drawer-body">
          <div v-if="!currentGradingRecord || !currentGradingRecord.essay_questions || currentGradingRecord.essay_questions.length === 0" style="text-align: center; padding: 40px 0; color: var(--text-secondary)">
            <p>该考生没有问答题</p>
          </div>
          <div v-else>
            <div v-for="(eq, idx) in currentGradingRecord.essay_questions" :key="eq.question_id" class="grading-drawer-item">
              <div class="item-header">
                <div class="item-index">题目 {{ idx + 1 }}</div>
                <a-tag color="arcoblue">满分 {{ eq.max_score }}分</a-tag>
              </div>
              <div class="item-content">
                <div class="question-title">{{ eq.title }}</div>
                <div class="answer-section">
                  <div class="answer-label">
                    <icon-user /> 考生答案
                  </div>
                  <div class="answer-text">{{ eq.user_answer || '(未作答)' }}</div>
                </div>
                <div class="score-section">
                  <a-input-number v-model="eq.currentScore" :min="0" :max="eq.max_score" :step="1" style="width: 120px" placeholder="评分" />
                  <span class="score-unit">分</span>
                  <a-input v-model="eq.remark" placeholder="评语 (可选)" style="width: 200px; margin-left: 12px" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="grading-drawer-footer">
          <a-button @click="showGradingDrawer = false" style="margin-right: 8px">取消</a-button>
          <a-button type="primary" @click="submitEssayScore(currentGradingRecord)" :loading="submittingScore">
            提交评分
          </a-button>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconUser, IconSearch, IconRefresh, IconClockCircle
} from '@arco-design/web-vue/es/icon'
import { getPendingGrading, gradeEssay, getPapers } from '@/api'
import { formatDateTime } from '@/utils/date'

export default {
  name: 'GradingPanel',
  components: { IconUser, IconSearch, IconRefresh, IconClockCircle },
  props: {
    papers: { type: Array, default: null }
  },
  emits: ['graded'],
  setup(props, { emit }) {
    const pendingGradingList = ref([])
    const showGradingDrawer = ref(false)
    const currentGradingRecord = ref(null)
    const submittingScore = ref(false)
    const pendingGradingSearch = ref('')
    const pendingGradingPaperFilter = ref(null)
    const pendingGradingPage = ref(1)
    const pendingGradingPageSize = ref(8)
    const papersList = ref([])

    // 有待评分的试卷数量（用于 badge 显示）
    const papersWithPendingGrading = ref({})

    const filteredPendingGradingList = computed(() => {
      let result = pendingGradingList.value || []
      if (pendingGradingSearch.value) {
        const kw = pendingGradingSearch.value.toLowerCase()
        result = result.filter(r => (r.student_name || '').toLowerCase().includes(kw))
      }
      if (pendingGradingPaperFilter.value) {
        result = result.filter(r => r.paper_id === pendingGradingPaperFilter.value)
      }
      const startIndex = (pendingGradingPage.value - 1) * pendingGradingPageSize.value
      return result.slice(startIndex, startIndex + pendingGradingPageSize.value)
    })

    const pendingGradingCount = computed(() => pendingGradingList.value?.length || 0)

    const loadPendingGrading = async () => {
      // 如果没有传入 papers，自己加载
      let papersToUse = props.papers
      if (!papersToUse) {
        try {
          const res = await getPapers({ pageSize: 100 })
          papersToUse = res.data?.list || res.data?.papers || []
          papersList.value = papersToUse
        } catch (e) {
          pendingGradingList.value = []
          papersWithPendingGrading.value = {}
          return
        }
      }
      if (!papersToUse || papersToUse.length === 0) {
        pendingGradingList.value = []
        papersWithPendingGrading.value = {}
        return
      }
      try {
        let allPending = []
        const pendingMap = {}
        for (const paper of papersToUse) {
          try {
            const res = await getPendingGrading(paper.id)
            if (res.data && res.data.list) {
              if (res.data.list.length > 0) {
                pendingMap[paper.id] = res.data.list.length
              }
              for (const record of res.data.list) {
                record.paper_title = paper.title
                if (!record.essay_questions) record.essay_questions = []
                for (const eq of record.essay_questions) {
                  eq.currentScore = 0
                  eq.remark = ''
                  if (!eq.max_score) {
                    eq.max_score = 0
                  }
                }
              }
              allPending = allPending.concat(res.data.list)
            }
          } catch (e) { console.error('加载待评分失败', e) }
        }
        pendingGradingList.value = allPending
        papersWithPendingGrading.value = pendingMap
      } catch (e) { console.error('加载待评分列表失败', e) }
    }

    const scrollToPaper = (paperId) => {
      const record = pendingGradingList.value.find(r => r.paper_id === paperId)
      if (record) {
        import('vue').then(({ nextTick }) => {
          nextTick(() => {
            const el = document.querySelector(`[data-record-id="${record.id}"]`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          })
        })
      }
    }

    const submitEssayScore = async (record) => {
      try {
        const hasZeroScore = record.essay_questions.some(eq => eq.currentScore === 0)
        if (hasZeroScore) {
          const confirmed = await new Promise(resolve => {
            Modal.confirm({
              title: '确认提交',
              content: '有题目得分为0分，确定要提交吗？',
              okText: '确定提交',
              cancelText: '取消',
              onOk: () => resolve(true),
              onCancel: () => resolve(false)
            })
          })
          if (!confirmed) return
        }
        
        const scores = record.essay_questions.map(eq => ({
          question_id: eq.question_id,
          score: eq.currentScore || 0,
          remark: eq.remark || ''
        }))
        
        await gradeEssay({ exam_record_id: record.id, scores })
        Message.success('评分提交成功')

        if (currentGradingRecord.value && currentGradingRecord.value.id === record.id) {
          const totalEssayScore = scores.reduce((sum, s) => sum + s.score, 0)
          currentGradingRecord.value.essay_score = totalEssayScore
          currentGradingRecord.value.graded = true
        }

        showGradingDrawer.value = false
        loadPendingGrading()
        emit('graded')
      } catch (e) {
        const errorMsg = e.response?.data?.message || e.message || '评分提交失败'
        Message.error(errorMsg)
        console.error('评分提交失败:', errorMsg)
      }
    }
    
    const openGradingDrawer = (record) => {
      const recordCopy = JSON.parse(JSON.stringify(record))
      if (recordCopy.essay_questions && recordCopy.essay_questions.length > 0) {
        recordCopy.essay_questions.forEach(eq => {
          if (eq.admin_score === undefined || eq.admin_score === null) {
            eq.currentScore = 0
          } else {
            eq.currentScore = eq.admin_score
          }
          eq.remark = eq.remark || ''
        })
      }
      currentGradingRecord.value = recordCopy
      showGradingDrawer.value = true
    }
    
    const filterPendingGrading = () => {
      // 筛选逻辑已经在 computed 中实现
    }
    
    const resetPendingGradingFilter = () => {
      pendingGradingSearch.value = ''
      pendingGradingPaperFilter.value = null
    }

    const studentAvatarColors = ['#165DFF', '#00B42A', '#F77234', '#F53F3F', '#722ED1', '#3370FF', '#00B96B', '#FF7D00']
    const getStudentAvatarColor = (name) => {
      if (!name) return '#165DFF'
      const index = name.charCodeAt(0) % studentAvatarColors.length
      return studentAvatarColors[index]
    }

    onMounted(() => {
      loadPendingGrading()
    })

    return {
      pendingGradingList,
      pendingGradingCount,
      papersWithPendingGrading,
      showGradingDrawer,
      currentGradingRecord,
      submittingScore,
      pendingGradingSearch,
      pendingGradingPaperFilter,
      pendingGradingPage,
      pendingGradingPageSize,
      filteredPendingGradingList,
      loadPendingGrading,
      submitEssayScore,
      openGradingDrawer,
      filterPendingGrading,
      resetPendingGradingFilter,
      scrollToPaper,
      getStudentAvatarColor,
      formatDateTime
    }
  }
}
</script>

<style scoped>
/* 从 Dashboard.vue 继承相关样式 */
.grading-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.grading-drawer-header {
  padding: 0 0 8px;
}
.header-info {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.header-meta {
  flex: 1;
}
.meta-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.meta-label {
  color: var(--color-text-3);
  font-size: 13px;
  min-width: 80px;
}
.meta-value {
  color: var(--color-text-1);
  font-size: 13px;
}
.score-highlight {
  color: #165DFF;
  font-weight: 600;
}
.grading-drawer-body {
  flex: 1;
  overflow-y: auto;
}
.grading-drawer-item {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.item-index {
  font-weight: 600;
  color: var(--color-text-1);
}
.item-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.question-title {
  font-size: 14px;
  color: var(--color-text-1);
  line-height: 1.6;
}
.answer-section {
  background: var(--color-fill-1);
  border-radius: 6px;
  padding: 12px;
}
.answer-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.answer-text {
  font-size: 14px;
  color: var(--color-text-1);
  line-height: 1.6;
  white-space: pre-wrap;
}
.score-section {
  display: flex;
  align-items: center;
  gap: 8px;
}
.score-unit {
  color: var(--color-text-2);
  font-size: 14px;
}
.grading-drawer-footer {
  padding-top: 16px;
  border-top: 1px solid var(--color-border-2);
  text-align: right;
}
</style>
