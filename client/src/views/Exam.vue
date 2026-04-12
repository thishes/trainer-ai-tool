<template>
  <div class="exam-page">
    <!-- 阶段1: 考试须知/开始页 -->
    <div v-if="!examStarted" class="start-exam">
      <div class="start-card">
        <div class="start-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h2>{{ paperInfo.title }}</h2>
        <p class="subtitle">请认真阅读考试信息，准备好后开始答题</p>
        <div class="exam-info">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="时间限制">{{ paperInfo.duration || paperInfo.time_limit }} 分钟</a-descriptions-item>
            <a-descriptions-item label="总分">{{ paperInfo.total_score }} 分</a-descriptions-item>
            <a-descriptions-item v-if="paperInfo.trainer" label="出题人">{{ paperInfo.trainer?.username }}</a-descriptions-item>
            <a-descriptions-item label="考生范围">
              <span v-if="paperInfo.allow_all_users !== false" style="color: #00b42a; font-weight: 500;">开放考试</span>
              <span v-else style="color: #ff7d00; font-weight: 500;">指定考生</span>
            </a-descriptions-item>
            <a-descriptions-item v-if="paperInfo.start_time || paperInfo.end_time" label="考试时间">
              <span>{{ formatDateTime(paperInfo.start_time) }} 至 {{ formatDateTime(paperInfo.end_time) }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 考试须知 -->
        <div class="exam-notice">
          <div class="notice-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            考试须知
          </div>
          <ul class="notice-list">
            <li>点击「开始考试」后计时开始，中途不可暂停</li>
            <li>系统每 30 秒自动保存答题进度</li>
            <li>倒计时结束将自动交卷，请合理分配时间</li>
            <li>剩余 5 分钟时将出现时间预警提示</li>
            <li>交卷前请确认所有题目已作答</li>
          </ul>
        </div>

        <div v-if="countdownTime > 0" class="countdown-section">
          <div class="countdown-title">距离考试开始还有</div>
          <div class="countdown-time">{{ formatCountdown(countdownTime) }}</div>
        </div>

        <a-form :model="startForm" layout="vertical" style="text-align: left">
          <a-form-item v-if="paperInfo.access_code" label="访问密码">
            <a-input v-model="startForm.access_code" placeholder="请输入访问密码" />
          </a-form-item>
          <a-form-item v-if="paperInfo.allow_all_users === false" label="考生号">
            <a-input v-model="startForm.student_no" placeholder="请输入考生号" />
          </a-form-item>
          <a-form-item :label="paperInfo.allow_all_users === false ? '考生姓名' : '您的姓名'">
            <a-input v-model="startForm.student_name" placeholder="请输入姓名" />
          </a-form-item>
        </a-form>

        <a-alert v-if="startError" type="error" style="margin-bottom: 16px">{{ startError }}</a-alert>

        <a-button type="primary" style="width: 100%; margin-top: 16px" :loading="loading" :disabled="!!startError || countdownTime > 0" @click="beginExam">
          {{ loading ? '加载中...' : (countdownTime > 0 ? '请等待倒计时结束' : '开始考试') }}
        </a-button>

        <div v-if="announcements.length > 0" class="announcements-section">
          <h3>公告</h3>
          <div v-for="a in announcements" :key="a.id" class="announcement-item">
            <h4>{{ a.title }}</h4>
            <SafeHtml :html="a.content" class="announcement-content" />
          </div>
        </div>
      </div>
    </div>

    <!-- 阶段2: 答题中 -->
    <div v-else class="exam-container">
      <!-- 离线横幅 -->
      <div v-if="!isOnline" class="offline-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        网络已断开，答题进度将在本地暂存，恢复网络后自动同步
      </div>

      <!-- 5分钟预警横幅 -->
      <div v-if="timeLeft <= 300 && timeLeft > 0" class="time-warning-banner" :class="{ urgent: timeLeft <= 60 }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span v-if="timeLeft <= 60">⚠️ 最后 {{ timeLeft }} 秒，即将自动交卷！</span>
        <span v-else>⏰ 距离考试结束还有 {{ Math.ceil(timeLeft / 60) }} 分钟</span>
      </div>

      <div class="exam-header">
        <h2>{{ examInfo.title || paperInfo.title }}</h2>
        <div class="exam-header-right">
          <!-- 自动保存指示器 -->
          <div class="save-indicator" :class="saveStatus">
            <svg v-if="saveStatus === 'saved'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else-if="saveStatus === 'saving'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span v-if="saveStatus === 'saved'">已保存</span>
            <span v-else-if="saveStatus === 'saving'">保存中...</span>
            <span v-else>保存失败</span>
          </div>
          <div class="exam-timer" :class="{ warning: timeLeft < 300, urgent: timeLeft <= 60 }" role="timer" :aria-label="`剩余时间 ${formatTime(timeLeft)}`" aria-live="polite">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {{ formatTime(timeLeft) }}
          </div>
        </div>
      </div>

      <div class="exam-content">
        <a-card class="question-card">
          <div class="question-header">
            <a-tag color="arcoblue" size="large">第 {{ currentIndex + 1 }} 题</a-tag>
            <a-tag size="large">{{ questionTypeName(currentQuestion.type) }}</a-tag>
            <a-tag color="green" size="large">{{ currentQuestion.score || 0 }}分</a-tag>
          </div>

          <a-divider style="margin: 12px 0" />

          <div class="question-title">{{ currentQuestion.title }}</div>

          <div v-if="currentQuestion.type === 'single'" class="options" role="radiogroup" :aria-label="`第${currentIndex + 1}题 - 单选`">
            <div
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              class="option-item"
              :class="{ selected: answers[currentQuestion.id] === option.key }"
              role="radio"
              :aria-checked="answers[currentQuestion.id] === option.key"
              tabindex="0"
              @click="selectAnswer(option.key)"
              @keydown.enter="selectAnswer(option.key)"
              @keydown.space.prevent="selectAnswer(option.key)"
            >
              <span class="option-key">{{ option.key }}</span>
              <span class="option-text">{{ option.value }}</span>
            </div>
          </div>

          <div v-if="currentQuestion.type === 'multiple'" class="options" role="group" :aria-label="`第${currentIndex + 1}题 - 多选`">
            <div
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              class="option-item"
              :class="{ selected: (answers[currentQuestion.id] || []).includes(option.key) }"
              role="checkbox"
              :aria-checked="(answers[currentQuestion.id] || []).includes(option.key)"
              tabindex="0"
              @click="toggleMultipleAnswer(option.key)"
              @keydown.enter="toggleMultipleAnswer(option.key)"
              @keydown.space.prevent="toggleMultipleAnswer(option.key)"
            >
              <span class="option-key">{{ option.key }}</span>
              <span class="option-text">{{ option.value }}</span>
            </div>
          </div>

          <div v-if="currentQuestion.type === 'judge'" class="options judge" role="radiogroup" :aria-label="`第${currentIndex + 1}题 - 判断`">
            <div
              class="option-item"
              :class="{ selected: answers[currentQuestion.id] === 'true' }"
              role="radio"
              :aria-checked="answers[currentQuestion.id] === 'true'"
              tabindex="0"
              @click="selectAnswer('true')"
              @keydown.enter="selectAnswer('true')"
              @keydown.space.prevent="selectAnswer('true')"
            >
              <span class="option-key">✓</span>
              <span class="option-text">对</span>
            </div>
            <div
              class="option-item"
              :class="{ selected: answers[currentQuestion.id] === 'false' }"
              role="radio"
              :aria-checked="answers[currentQuestion.id] === 'false'"
              tabindex="0"
              @click="selectAnswer('false')"
              @keydown.enter="selectAnswer('false')"
              @keydown.space.prevent="selectAnswer('false')"
            >
              <span class="option-key">✗</span>
              <span class="option-text">错</span>
            </div>
          </div>

          <div v-if="isSubjective(currentQuestion.type)" class="subjective-answer">
            <div class="answer-instruction">请在下方输入你的答案：</div>
            <a-textarea 
              v-model="answers[currentQuestion.id]" 
              placeholder="请输入你的答案..." 
              :rows="8"
              class="answer-textarea"
            />
            <div class="word-count">已输入 {{ essayWordCount }} 字</div>
          </div>
        </a-card>

        <!-- 分组题目导航 -->
        <div class="question-nav">
          <a-button class="nav-btn" :disabled="currentIndex === 0" @click="prevQuestion">
            <template #icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg></template>
            上一题
          </a-button>

          <div class="nav-center">
            <div v-if="questionTypeGroups.length > 1" class="type-tabs">
              <button
                v-for="group in questionTypeGroups"
                :key="group.type"
                class="type-tab"
                :class="{ active: currentTypeGroup === group.type }"
                @click="goToTypeGroup(group.type)"
              >
                {{ group.label }}({{ group.count }})
              </button>
            </div>
            <div class="question-dots">
              <span
                v-for="q in currentGroupQuestions"
                :key="q.id"
                class="dot"
                :class="{ current: q.id === currentQuestion.id, answered: isAnswered(q.id) }"
                @click="goToQuestion(q._originalIndex)"
                :title="`第${q._originalIndex + 1}题`"
              ></span>
            </div>
          </div>

          <a-button v-if="currentIndex < questions.length - 1" type="primary" @click="nextQuestion">
            下一题
            <template #icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg></template>
          </a-button>
          <a-button v-else type="primary" status="warning" @click="showSubmitConfirm">
            交卷
          </a-button>
        </div>

        <div class="progress-bar-wrapper">
          <div class="progress-info">
            <span>答题进度</span>
            <span>{{ answeredCount }} / {{ questions.length }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 交卷确认弹窗 - 增强版 -->
    <a-modal v-model:visible="submitDialogVisible" title="确认交卷" :width="440"
      @before-ok="submitExam" @cancel="onSubmitCancel"
      :ok-text="'确认交卷'" :cancel-text="'再检查一下'"
      :ok-button-props="{ status: unansweredCount > 0 ? 'warning' : 'primary' }">
      <div style="padding: 12px 0">
        <div style="text-align: center; margin-bottom: 20px">
          <div style="font-size: 48px; font-weight: 700; margin-bottom: 4px" :style="{ color: unansweredCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }">
            {{ answeredCount }} / {{ questions.length }}
          </div>
          <div style="color: var(--text-secondary); font-size: 14px">已答题数</div>
        </div>

        <a-alert v-if="unansweredCount > 0" type="warning" style="margin-bottom: 16px">
          <template #icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></template>
          还有 <strong style="color: var(--color-danger); font-size: 16px">{{ unansweredCount }}</strong> 道题未作答，交卷后将无法修改！
        </a-alert>
        <a-alert v-else type="success">
          所有题目已作答，确认无误后请交卷
        </a-alert>

        <!-- 未答题快速跳转 -->
        <div v-if="unansweredList.length > 0" class="unanswered-links">
          <span style="color: var(--text-secondary); font-size: 13px">点击跳转到未答题：</span>
          <a-button v-for="q in displayUnanswered" :key="q.id" size="mini" type="outline" status="warning"
            @click="jumpToUnanswered(q._index)">
            第{{ q._index + 1 }}题
          </a-button>
          <a-button v-if="unansweredList.length > 10" size="mini" type="text"
            @click="showAllUnanswered = !showAllUnanswered">
            {{ showAllUnanswered ? '收起' : `还有 ${unansweredList.length - 10} 题...` }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <div class="footer">
      <span>© thishe.com</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import DOMPurify from 'dompurify'
import SafeHtml from '@/components/SafeHtml.vue'
import { getPaperPublic, startExamApi, getExamQuestions, saveProgress, submitExam as submitExamApi, getAnnouncements } from '@/api'
import { formatDateTime } from '@/utils/date'

export default {
  name: 'ExamPage',
  components: { SafeHtml },
  setup() {
    const route = useRoute()
    const router = useRouter()

    const paperId = ref(route.params.id)
    const paperInfo = ref({})
    const examId = ref(null)
    const examInfo = ref({})
    const examStarted = ref(false)
    const questions = ref([])
    const currentIndex = ref(0)
    const answers = ref({})
    const timeLeft = ref(0)
    const submitDialogVisible = ref(false)
    const loading = ref(false)
    const startError = ref('')
    const startForm = ref({
      student_no: '',
      student_name: '',
      access_code: route.query.code || ''
    })
    const announcements = ref([])
    const saveStatus = ref('saved') // 'saved' | 'saving' | 'error'
    const isOnline = ref(navigator.onLine !== false)
    const currentTypeGroup = ref('')
    const showAllUnanswered = ref(false)
    let timer = null
    let countdownTimer = null
    const countdownTime = ref(0)

    const formatCountdown = (seconds) => {
      const d = Math.floor(seconds / 86400)
      const h = Math.floor((seconds % 86400) / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = seconds % 60
      let str = ''
      if (d > 0) str += `${d}天`
      if (h > 0) str += `${h}时`
      if (m > 0) str += `${m}分`
      str += `${s}秒`
      return str
    }

    const loadAnnouncements = async () => {
      try {
        const res = await getAnnouncements({ status: 'published' })
        const list = res.data?.list || res.data || []
        announcements.value = (Array.isArray(list) ? list : []).map(a => ({
          ...a,
          content: DOMPurify.sanitize(a.content || '', { USE_PROFILES: { html: true } })
        }))
      } catch (e) {
        console.error(e)
      }
    }

    const currentQuestion = computed(() => questions.value[currentIndex.value] || {})

    const answeredCount = computed(() => {
      return Object.keys(answers.value).filter(key => {
        const val = answers.value[key]
        return val !== undefined && val !== '' && val !== null && (Array.isArray(val) ? val.length > 0 : true)
      }).length
    })

    const unansweredCount = computed(() => questions.value.length - answeredCount.value)

    const progressPercent = computed(() => {
      if (questions.value.length === 0) return 0
      return Math.round((answeredCount.value / questions.value.length) * 100)
    })

    const unansweredList = computed(() => {
      return questions.value
        .map((q, index) => ({ ...q, _index: index }))
        .filter(q => !isAnswered(q.id))
    })

    // 未答题列表：默认最多显示10项，展开后显示全部
    const displayUnanswered = computed(() => {
      if (showAllUnanswered.value || unansweredList.value.length <= 10) {
        return unansweredList.value
      }
      return unansweredList.value.slice(0, 10)
    })

    // 主观题字数统计
    const essayWordCount = computed(() => {
      const val = answers.value[currentQuestion.value.id]
      if (!val || typeof val !== 'string') return 0
      return val.length
    })

    // 判断是否为主观题
    const isSubjective = (type) => {
      return type === 'subjective' || type === 'essay' || type === 'question'
    }

    // 分组导航：按题型分组
    const questionTypeGroups = computed(() => {
      const typeMap = {}
      questions.value.forEach((q, index) => {
        const type = q.type || 'unknown'
        if (!typeMap[type]) {
          typeMap[type] = {
            type,
            label: questionTypeName(type),
            count: 0,
            questions: []
          }
        }
        typeMap[type].count++
        typeMap[type].questions.push({ ...q, _originalIndex: index })
      })
      // 按固定顺序排列
      const order = ['single', 'multiple', 'judge', 'subjective', 'essay', 'question', 'unknown']
      const groups = order
        .filter(t => typeMap[t])
        .map(t => typeMap[t])
      // 如果有不在 order 中的类型也加上
      Object.values(typeMap).forEach(g => {
        if (!groups.find(gg => gg.type === g.type)) groups.push(g)
      })
      return groups
    })

    const currentGroupQuestions = computed(() => {
      if (questionTypeGroups.value.length <= 1) {
        // 只有一种题型或没有分组，显示所有题
        return questions.value.map((q, i) => ({ ...q, _originalIndex: i }))
      }
      const group = questionTypeGroups.value.find(g => g.type === currentTypeGroup.value)
      return group ? group.questions : []
    })

    const questionTypeName = (type) => {
      const map = { 
        single: '单选题', 
        multiple: '多选题', 
        judge: '判断题', 
        subjective: '问答题',
        essay: '问答题',
        question: '问答题'
      }
      return map[type] || '未知题型'
    }

    const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    const isAnswered = (questionId) => {
      const val = answers.value[questionId]
      return val !== undefined && val !== '' && val !== null && (Array.isArray(val) ? val.length > 0 : true)
    }

    const selectAnswer = (key) => {
      answers.value[currentQuestion.value.id] = key
    }

    const toggleMultipleAnswer = (key) => {
      if (!answers.value[currentQuestion.value.id]) {
        answers.value[currentQuestion.value.id] = []
      }
      const arr = answers.value[currentQuestion.value.id]
      const idx = arr.indexOf(key)
      if (idx > -1) {
        arr.splice(idx, 1)
      } else {
        arr.push(key)
      }
    }

    const prevQuestion = () => {
      if (currentIndex.value > 0) currentIndex.value--
    }

    const nextQuestion = () => {
      if (currentIndex.value < questions.value.length - 1) currentIndex.value++
    }

    const goToQuestion = (index) => {
      currentIndex.value = index
    }

    const goToTypeGroup = (type) => {
      currentTypeGroup.value = type
      // 跳转到该组第一题
      const group = questionTypeGroups.value.find(g => g.type === type)
      if (group && group.questions.length > 0) {
        currentIndex.value = group.questions[0]._originalIndex
      }
    }

    const showSubmitConfirm = () => {
      submitDialogVisible.value = true
    }

    // 从交卷弹窗跳转到未答题
    const jumpToUnanswered = (index) => {
      submitDialogVisible.value = false
      currentIndex.value = index
    }

    const onSubmitCancel = () => {
      submitDialogVisible.value = false
    }

    const beginExam = async () => {
      if (!startForm.value.student_name) {
        Message.warning('请输入姓名')
        return
      }
      if (paperInfo.value.allow_all_users === false && !startForm.value.student_no) {
        Message.warning('请输入考生号')
        return
      }
      loading.value = true
      try {
        const paperRes = await getPaperPublic(paperId.value, { access_code: startForm.value.access_code })
        paperInfo.value = paperRes.data

        const startRes = await startExamApi({
          paper_id: paperId.value,
          student_name: startForm.value.student_name,
          student_no: startForm.value.student_no || null,
          access_code: startForm.value.access_code
        })

        examId.value = startRes.data.exam_id
        examInfo.value = startRes.data

        const questionsRes = await getExamQuestions(examId.value)
        questions.value = questionsRes.data.questions || []

        if (questionsRes.data.answers) {
          answers.value = questionsRes.data.answers
        }

        timeLeft.value = paperInfo.value.time_limit * 60
        startTimer()

        examStarted.value = true
        startError.value = ''

        // 初始化分组导航
        if (questionTypeGroups.value.length > 0) {
          currentTypeGroup.value = questionTypeGroups.value[0].type
        }
      } catch (error) {
        const msg = error.response?.data?.message || '加载试卷信息失败，请检查链接是否正确'
        startError.value = msg
        Message.error(msg)
      } finally {
        loading.value = false
      }
    }

    const startTimer = () => {
      timer = setInterval(() => {
        if (timeLeft.value > 0) {
          timeLeft.value--
          if (timeLeft.value % 30 === 0) {
            doSaveProgress()
          }
          // 5分钟和1分钟声音提醒（如果浏览器允许）
          if (timeLeft.value === 300 || timeLeft.value === 60) {
            try {
              const ac = new AudioContext()
              const osc = ac.createOscillator()
              const gain = ac.createGain()
              osc.connect(gain)
              gain.connect(ac.destination)
              osc.frequency.value = timeLeft.value === 60 ? 880 : 660
              gain.gain.value = 0.15
              osc.start()
              osc.stop(ac.currentTime + 0.3)
            } catch (e) { /* 静默失败 */ }
          }
        } else {
          clearInterval(timer)
          submitExam(true)
        }
      }, 1000)
    }

    const doSaveProgress = async () => {
      if (!examId.value) return
      saveStatus.value = 'saving'
      try {
        await saveProgress({ exam_id: examId.value, answers: answers.value })
        saveStatus.value = 'saved'
      } catch (e) {
        saveStatus.value = 'error'
        // 5秒后重置状态，避免一直显示错误
        setTimeout(() => {
          if (saveStatus.value === 'error') saveStatus.value = 'saved'
        }, 5000)
      }
    }

    const submitExam = async () => {
      clearInterval(timer)
      try {
        const res = await submitExamApi({
          exam_id: examId.value,
          answers: answers.value
        })

        if (res.success !== false && res.data) {
          // 只传 examId，结果页通过 API 获取数据
          router.push(`/exam/result/${examId.value}`)
          submitDialogVisible.value = false
          return true
        } else {
          Message.error(res.message || '提交失败')
          // 重新启动计时器
          if (timeLeft.value > 0) startTimer()
          return false
        }
      } catch (error) {
        console.error('提交失败:', error)
        Message.error('提交失败，请重试')
        // 重新启动计时器
        if (timeLeft.value > 0) startTimer()
        return false
      }
    }

    // 网络状态监听
    const handleOnline = () => {
      isOnline.value = true
      // 恢复网络后尝试同步进度
      doSaveProgress()
      Message.success('网络已恢复，进度已同步')
    }
    const handleOffline = () => {
      isOnline.value = false
    }

    onMounted(async () => {
      try {
        const paperRes = await getPaperPublic(paperId.value)
        paperInfo.value = paperRes.data
        if (paperInfo.value.start_time) {
          startCountdown()
        }
      } catch (error) {
        Message.error('加载试卷信息失败，请检查链接是否正确')
      }
      loadAnnouncements()

      // 监听网络状态
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    })

    const startCountdown = () => {
      if (countdownTimer) clearInterval(countdownTimer)
      const updateCountdown = () => {
        const now = Date.now()
        const start = new Date(paperInfo.value.start_time).getTime()
        const diff = Math.floor((start - now) / 1000)
        if (diff <= 0) {
          countdownTime.value = 0
          if (countdownTimer) clearInterval(countdownTimer)
        } else {
          countdownTime.value = diff
        }
      }
      updateCountdown()
      countdownTimer = setInterval(updateCountdown, 1000)
    }

    watch(() => startForm.value.access_code, () => {
      if (startError.value) {
        startError.value = ''
      }
    })

    watch(submitDialogVisible, (visible) => {
      if (!visible && examStarted.value && timeLeft.value > 0) {
        startTimer()
      }
    })

    // 当切换题目时，同步当前分组
    watch(currentIndex, (idx) => {
      const q = questions.value[idx]
      if (q && questionTypeGroups.value.length > 1) {
        currentTypeGroup.value = q.type || 'unknown'
      }
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
      if (countdownTimer) clearInterval(countdownTimer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })

    return {
      paperInfo, examInfo, examStarted, questions, currentIndex, currentQuestion,
      answers, timeLeft, submitDialogVisible, loading, startForm, startError,
      answeredCount, unansweredCount, progressPercent, questionTypeName, formatTime,
      isAnswered, isSubjective, essayWordCount, saveStatus, isOnline,
      selectAnswer, toggleMultipleAnswer, prevQuestion, nextQuestion, goToQuestion,
      showSubmitConfirm, beginExam, submitExam, announcements, onSubmitCancel,
      countdownTime, formatDateTime, formatCountdown, jumpToUnanswered, unansweredList,
      displayUnanswered, showAllUnanswered,
      questionTypeGroups, currentTypeGroup, currentGroupQuestions, goToTypeGroup
    }
  }
}
</script>

<style scoped>
* { box-sizing: border-box; }
.exam-page {
  min-height: 100vh;
  background: var(--bg-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.start-exam {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}
.start-card {
  background: var(--bg-color-white);
  padding: 40px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-dropdown);
  max-width: 440px;
  width: 100%;
  text-align: center;
}
.start-card-icon {
  width: 56px;
  height: 56px;
  background: var(--color-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}
.start-card-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}
.start-card h2 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}
.start-card .subtitle {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 20px;
}
.exam-info {
  background: var(--bg-color);
  padding: 16px 20px;
  border-radius: var(--radius-base);
  margin: 20px 0;
  text-align: left;
}
.exam-info :deep(.arco-descriptions-item-label) {
  color: var(--text-secondary);
  font-size: 13px;
}
.exam-info :deep(.arco-descriptions-item-value) {
  color: var(--color-primary);
  font-weight: 500;
}

/* 考试须知 */
.exam-notice {
  background: rgba(var(--arcoblue-1), 0.5);
  border: 1px solid rgba(var(--arcoblue-3), 0.3);
  border-radius: var(--radius-base);
  padding: 14px 16px;
  margin: 16px 0;
  text-align: left;
}
.notice-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 10px;
}
.notice-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
}
.notice-list li {
  list-style-type: disc;
}

.question-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  margin-bottom: 20px;
}
.question-card :deep(.arco-card__header) {
  background: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color-light);
  padding: 14px 20px;
}
.question-header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.question-header .arco-tag {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 16px;
  border-radius: var(--radius-base);
}
.question-title {
  font-size: 16px;
  color: var(--text-primary);
  line-height: 1.7;
  margin: 20px 0;
  font-weight: 500;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.option-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--bg-color-white);
}
.option-item:hover {
  border-color: var(--color-primary);
  background: var(--bg-color-hover);
}
.option-item.selected {
  border-color: var(--color-primary);
  background: rgba(22, 93, 255, 0.08);
}
.option-key {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 12px;
  flex-shrink: 0;
}
.option-item.selected .option-key {
  background: var(--color-primary);
  color: white;
}
.option-text {
  flex: 1;
  color: var(--text-regular);
  font-size: 14px;
  line-height: 1.5;
}
.options.judge {
  flex-direction: row;
  gap: 16px;
}
.options.judge .option-item {
  flex: 1;
  justify-content: center;
}
.subjective-answer {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-color);
  border-radius: var(--radius-base);
}
.answer-instruction {
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
}
.answer-textarea {
  width: 100%;
  font-size: 14px;
  line-height: 1.6;
  border-color: var(--border-color);
  transition: all 0.3s;
}
.answer-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.1);
}
.word-count {
  text-align: right;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.exam-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}
.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-color-white);
  padding: 16px 24px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  margin-bottom: 20px;
}
.exam-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exam-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

/* 自动保存指示器 */
.save-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-small);
  background: var(--bg-color);
  transition: all var(--transition-base);
}
.save-indicator.saved {
  color: var(--color-success);
}
.save-indicator.saving {
  color: var(--color-primary);
}
.save-indicator.error {
  color: var(--color-danger);
}
.save-indicator .spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.exam-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary);
  font-family: 'Monaco', 'Menlo', monospace;
}
.exam-timer svg {
  width: 20px;
  height: 20px;
}
.exam-timer.warning {
  color: var(--color-warning);
}
.exam-timer.urgent {
  color: var(--color-danger);
}
.exam-timer.warning svg,
.exam-timer.urgent svg {
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 离线横幅 */
.offline-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-danger);
  color: white;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-base);
  margin-bottom: 12px;
  animation: slideDown 0.3s ease;
}

/* 5分钟预警横幅 */
.time-warning-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 125, 0, 0.1);
  border: 1px solid rgba(255, 125, 0, 0.3);
  color: var(--color-warning);
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-base);
  margin-bottom: 12px;
  animation: slideDown 0.3s ease;
}
.time-warning-banner.urgent {
  background: rgba(245, 63, 63, 0.1);
  border-color: rgba(245, 63, 63, 0.3);
  color: var(--color-danger);
  animation: pulse 1.5s infinite;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.question-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.nav-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 分组标签页导航 */
.type-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-color);
  padding: 3px;
  border-radius: var(--radius-base);
  margin-bottom: 4px;
}
.type-tab {
  padding: 4px 12px;
  font-size: 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-small);
  transition: all var(--transition-base);
  white-space: nowrap;
}
.type-tab:hover {
  color: var(--text-primary);
}
.type-tab.active {
  background: var(--color-primary);
  color: white;
  font-weight: 500;
}

.question-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 400px;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--border-color);
  cursor: pointer;
  transition: all var(--transition-base);
  border: 2px solid transparent;
}
.dot:hover {
  transform: scale(1.2);
  border-color: var(--color-primary);
}
.dot.current {
  background: var(--color-primary);
  transform: scale(1.3);
  border-color: var(--color-primary);
}
.dot.answered {
  background: var(--color-success);
}

/* 答题进度条 */
.progress-bar-wrapper {
  margin-top: 12px;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.progress-bar {
  height: 4px;
  background: var(--border-color-light);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* 未答题快速跳转 */
.unanswered-links {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color-light);
}

.exam-page .footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 13px;
  background: var(--bg-color);
  border-top: 1px solid var(--border-color-light);
}

.announcements-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color-light);
}

.announcements-section h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.announcement-item {
  background: var(--bg-color);
  border-radius: var(--radius-base);
  padding: 16px;
  margin-bottom: 12px;
}

.announcement-item h4 {
  margin-bottom: 8px;
  color: var(--text-primary);
}

.announcement-content {
  color: var(--text-secondary);
  line-height: 1.6;
}

.announcement-content :deep(img) {
  max-width: 100%;
  height: auto;
  margin-top: 8px;
}

@media screen and (max-width: 767.98px) {
  .exam-container {
    padding: 12px;
  }

  .start-card {
    padding: 24px 16px;
    margin: 10px;
  }

  .start-card-icon {
    width: 48px;
    height: 48px;
  }

  .start-card h2 {
    font-size: 18px;
  }

  .exam-header {
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
  }

  .exam-header h2 {
    font-size: 16px;
    text-align: center;
  }

  .exam-header-right {
    width: 100%;
    justify-content: center;
  }

  .question-title {
    font-size: 15px;
  }

  .option-item {
    padding: 10px 12px;
  }

  .option-text {
    font-size: 13px;
  }

  .type-tabs {
    font-size: 11px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .type-tab {
    padding: 3px 8px;
    font-size: 11px;
  }

  .question-dots {
    max-width: 280px;
  }

  .dot {
    width: 10px;
    height: 10px;
  }

  .question-nav {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .question-nav .arco-btn {
    width: 100%;
  }

  .nav-center {
    width: 100%;
  }

  .exam-info {
    padding: 12px;
  }

  .exam-notice {
    padding: 10px 12px;
  }

  .notice-list {
    font-size: 12px;
  }

  .exam-page .footer {
    padding: 12px;
    font-size: 12px;
  }

  .countdown-section {
    padding: 16px;
  }

  .countdown-title {
    font-size: 12px;
  }

  .countdown-time {
    font-size: 24px;
  }

  .save-indicator {
    font-size: 11px;
  }
}
</style>
