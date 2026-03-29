<template>
  <div class="exam-page">
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
            <a-descriptions-item label="时间限制">{{ paperInfo.time_limit }} 分钟</a-descriptions-item>
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
            <div class="announcement-content" v-html="a.content"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="exam-container">
      <div class="exam-header">
        <h2>{{ examInfo.title }}</h2>
        <div class="exam-timer" :class="{ warning: timeLeft < 300 }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          {{ formatTime(timeLeft) }}
        </div>
      </div>

      <div class="exam-content">
        <a-card class="question-card">
          <template #header>
            <div class="question-header">
              <a-tag color="arcoblue">第 {{ currentIndex + 1 }} 题</a-tag>
              <a-tag>{{ questionTypeName(currentQuestion.type) }}</a-tag>
              <a-tag color="green">{{ currentQuestion.score }}分</a-tag>
            </div>
          </template>

          <div class="question-title">{{ currentQuestion.title }}</div>

          <div v-if="currentQuestion.type === 'single'" class="options">
            <div
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              class="option-item"
              :class="{ selected: answers[currentQuestion.id] === option.key }"
              @click="selectAnswer(option.key)"
            >
              <span class="option-key">{{ option.key }}</span>
              <span class="option-text">{{ option.value }}</span>
            </div>
          </div>

          <div v-if="currentQuestion.type === 'multiple'" class="options">
            <div
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              class="option-item"
              :class="{ selected: (answers[currentQuestion.id] || []).includes(option.key) }"
              @click="toggleMultipleAnswer(option.key)"
            >
              <span class="option-key">{{ option.key }}</span>
              <span class="option-text">{{ option.value }}</span>
            </div>
          </div>

          <div v-if="currentQuestion.type === 'judge'" class="options judge">
            <div
              class="option-item"
              :class="{ selected: answers[currentQuestion.id] === 'true' }"
              @click="selectAnswer('true')"
            >
              <span class="option-key">T</span>
              <span class="option-text">正确</span>
            </div>
            <div
              class="option-item"
              :class="{ selected: answers[currentQuestion.id] === 'false' }"
              @click="selectAnswer('false')"
            >
              <span class="option-key">F</span>
              <span class="option-text">错误</span>
            </div>
          </div>

          <div v-if="currentQuestion.type === 'subjective'" class="subjective-answer">
            <a-textarea v-model="answers[currentQuestion.id]" placeholder="请输入你的答案..." :rows="6" />
          </div>
        </a-card>

        <div class="question-nav">
          <a-button class="nav-btn" :disabled="currentIndex === 0" @click="prevQuestion">
            <template #icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg></template>
            上一题
          </a-button>

          <div class="question-dots">
            <span
              v-for="(q, idx) in questions"
              :key="q.id"
              class="dot"
              :class="{ current: idx === currentIndex, answered: isAnswered(q.id) }"
              @click="goToQuestion(idx)"
            ></span>
          </div>

          <a-button v-if="currentIndex < questions.length - 1" type="primary" @click="nextQuestion">
            下一题
            <template #icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg></template>
          </a-button>
          <a-button v-else type="primary" status="warning" @click="showSubmitConfirm">
            交卷
          </a-button>
        </div>

        <a-alert v-if="unansweredCount > 0" type="warning" style="margin-top: 16px">
          已答题: {{ answeredCount }} / {{ questions.length }}，还有 {{ unansweredCount }} 道题未作答
        </a-alert>
        <a-alert v-else type="success" style="margin-top: 16px">
          已答题: {{ answeredCount }} / {{ questions.length }}
        </a-alert>
      </div>
    </div>

    <a-modal v-model:visible="submitDialogVisible" title="确认交卷" :width="400"
      @before-ok="submitExam" @cancel="submitDialogVisible = false"
      :ok-text="'确认交卷'" :cancel-text="'再检查一下'">
      <div style="text-align: center; padding: 20px 0">
        <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 16px">你确定要交卷吗？</p>
        <a-statistic :value="answeredCount" :value-from="0" :to="questions.length" title="已答题">
          <template #suffix>/ {{ questions.length }}</template>
        </a-statistic>
        <a-alert v-if="unansweredCount > 0" type="warning" style="margin-top: 16px">
          还有 {{ unansweredCount }} 道题未作答
        </a-alert>
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
import { getPaperPublic, startExamApi, getExamQuestions, saveProgress, submitExam as submitExamApi, getAnnouncements } from '@/api'

export default {
  name: 'ExamPage',
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
    let timer = null
    let countdownTimer = null
    const countdownTime = ref(0)

    const formatDateTime = (datetime) => {
      if (!datetime) return '-'
      const date = new Date(datetime)
      return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

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
        announcements.value = (res.data || []).map(a => ({
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

    const questionTypeName = (type) => {
      const map = { single: '单选题', multiple: '多选题', judge: '判断题', subjective: '问答题' }
      return map[type] || type
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

    const showSubmitConfirm = () => {
      submitDialogVisible.value = true
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
        console.log('questionsRes:', questionsRes)
        console.log('questionsRes.data:', questionsRes.data)
        console.log('questionsRes.data.questions:', questionsRes.data?.questions)
        questions.value = questionsRes.data.questions || []

        if (questionsRes.data.answers) {
          answers.value = questionsRes.data.answers
        }

        timeLeft.value = paperInfo.value.time_limit * 60
        startTimer()

        examStarted.value = true
        startError.value = ''
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
            saveProgress({ exam_id: examId.value, answers: answers.value }).catch(() => {})
          }
        } else {
          clearInterval(timer)
          submitExam(true)
        }
      }, 1000)
    }

    const submitExam = async () => {
      clearInterval(timer)
      try {
        const res = await submitExamApi({
          exam_id: examId.value,
          answers: answers.value
        })

        if (res.success !== false && res.data) {
          const resultData = res.data || res
          const queryData = encodeURIComponent(JSON.stringify(resultData))
          router.push(`/exam/result/${examId.value}?data=${queryData}`)
          submitDialogVisible.value = false
          return true
        } else {
          Message.error(res.message || '提交失败')
          return false
        }
      } catch (error) {
        console.error('提交失败:', error)
        Message.error('提交失败，请重试')
        return false
      }
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

    onUnmounted(() => {
      if (timer) clearInterval(timer)
      if (countdownTimer) clearInterval(countdownTimer)
    })

    return {
      paperInfo, examInfo, examStarted, questions, currentIndex, currentQuestion,
      answers, timeLeft, submitDialogVisible, loading, startForm, startError,
      answeredCount, unansweredCount, questionTypeName, formatTime, isAnswered,
      selectAnswer, toggleMultipleAnswer, prevQuestion, nextQuestion, goToQuestion,
      showSubmitConfirm, beginExam, submitExam, announcements,
      countdownTime, formatDateTime, formatCountdown
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
  color: var(--color-danger);
}
.exam-timer.warning svg {
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
.question-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 400px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--border-color);
  cursor: pointer;
  transition: all var(--transition-base);
}
.dot:hover {
  transform: scale(1.2);
}
.dot.current {
  background: var(--color-primary);
  transform: scale(1.3);
}
.dot.answered {
  background: var(--color-success);
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
    gap: 12px;
    padding: 12px 16px;
  }

  .exam-header h2 {
    font-size: 16px;
  }

  .exam-timer {
    font-size: 16px;
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

  .exam-info {
    padding: 12px;
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
}
</style>
.announcement-content img {
  max-width: 100%;
  height: auto;
  margin-top: 8px;
}