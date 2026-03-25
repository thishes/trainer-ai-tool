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
          </a-descriptions>
        </div>

        <a-form :model="startForm" layout="vertical" style="text-align: left">
          <a-form-item v-if="paperInfo.access_code" label="访问密码">
            <a-input v-model="startForm.access_code" placeholder="请输入访问密码" />
          </a-form-item>
          <a-form-item label="您的姓名">
            <a-input v-model="startForm.student_name" placeholder="请输入姓名" />
          </a-form-item>
        </a-form>

        <a-button type="primary" style="width: 100%; margin-top: 16px" :loading="loading" @click="beginExam">
          {{ loading ? '加载中...' : '开始考试' }}
        </a-button>
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
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { getPaperPublic, startExamApi, getExamQuestions, saveProgress, submitExam as submitExamApi } from '@/api'

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
    const startForm = ref({
      student_name: '',
      access_code: route.query.code || ''
    })
    let timer = null

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
      loading.value = true
      try {
        const paperRes = await getPaperPublic(paperId.value, { access_code: startForm.value.access_code })
        paperInfo.value = paperRes.data

        const startRes = await startExamApi({
          paper_id: paperId.value,
          student_name: startForm.value.student_name,
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
      } catch (error) {
        Message.error('加载试卷信息失败，请检查链接是否正确')
        console.error(error)
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
      } catch (error) {
        Message.error('加载试卷信息失败，请检查链接是否正确')
      }
    })

    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    return {
      paperInfo, examInfo, examStarted, questions, currentIndex, currentQuestion,
      answers, timeLeft, submitDialogVisible, loading, startForm,
      answeredCount, unansweredCount, questionTypeName, formatTime, isAnswered,
      selectAnswer, toggleMultipleAnswer, prevQuestion, nextQuestion, goToQuestion,
      showSubmitConfirm, beginExam, submitExam
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
</style>