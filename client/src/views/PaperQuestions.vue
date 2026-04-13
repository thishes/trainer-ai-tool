<template>
  <div class="paper-questions">
    <div class="header">
      <div class="header-left">
        <a-button @click="goBack">← 返回</a-button>
        <h2>{{ paper?.title || '加载中...' }} - 题目管理</h2>
      </div>
      <div class="header-right">
        <a-button type="primary" @click="showAddFromBank = true">📥 从题库选择</a-button>
        <a-button type="success" @click="showNewQuestion = true">➕ 新建题目</a-button>
        <a-button @click="showImport = true">📤 批量导入</a-button>
      </div>
    </div>

    <a-card style="margin-top: 20px">
      <template #header>
        <span>已关联题目 ({{ paperQuestions.length }}) - 总分: {{ totalScore }}分</span>
      </template>

      <div v-if="paperQuestions.length > 0">
        <div v-for="q in paperQuestions" :key="q.id" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color-light)">
          <div>
            <strong>{{ q.id }}.</strong> {{ q.title }}
            <a-tag v-if="q.type === 'single'" color="blue" size="small">单选</a-tag>
            <a-tag v-else-if="q.type === 'multiple'" color="orange" size="small">多选</a-tag>
            <a-tag v-else-if="q.type === 'judge'" color="gray" size="small">判断</a-tag>
            <a-tag v-else color="green" size="small">问答</a-tag>
            <span style="color: #666; margin-left: 10px">{{ q.score }}分</span>
          </div>
          <a-button size="small" status="danger" @click="removeQuestion(q.id)">移除</a-button>
        </div>
      </div>
      <a-empty v-else description="暂无题目，请添加题目" />
    </a-card>

    <a-modal v-model:visible="showAddFromBank" title="从题库选择题目" :width="700" @cancel="showAddFromBank = false" @ok="addFromBank" :ok-text="'添加已选 (' + selectedQuestions.length + ')'" :cancel-text="'取消'" :ok-disabled="selectedQuestions.length === 0">
      <a-input v-model="searchText" placeholder="搜索题目..." style="margin-bottom: 10px" allow-clear />

      <div v-if="filteredQuestions.length > 0">
        <div v-for="q in filteredQuestions" :key="q.id"
          :style="{ display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border-color-light)', cursor: 'pointer', background: selectedQuestions.includes(q) ? 'var(--color-primary-light-1)' : 'transparent' }"
          @click="toggleQuestionSelection(q)">
          <a-checkbox :checked="selectedQuestions.includes(q)" style="margin-right: 10px" />
          <div style="flex: 1">
            <strong>{{ q.id }}.</strong> {{ q.title }}
            <a-tag v-if="q.type === 'single'" color="blue" size="small">单选</a-tag>
            <a-tag v-else-if="q.type === 'multiple'" color="orange" size="small">多选</a-tag>
            <a-tag v-else-if="q.type === 'judge'" color="gray" size="small">判断</a-tag>
            <a-tag v-else color="green" size="small">问答</a-tag>
          </div>
        </div>
      </div>
      <a-empty v-else description="题库中暂无题目" />
    </a-modal>

    <a-modal v-model:visible="showNewQuestion" title="新建题目" :width="600" @before-ok="createQuestionAndAdd" @cancel="showNewQuestion = false" :ok-text="'保存并添加到试卷'" :cancel-text="'取消'">
      <a-form :model="questionForm" layout="vertical" :label-col-props="{ span: 6 }" :wrapper-col-props="{ span: 18 }">
        <a-form-item label="题目内容">
          <a-textarea v-model="questionForm.title" :rows="3" />
        </a-form-item>
        <a-form-item label="题型">
          <a-select v-model="questionForm.type">
            <a-option label="单选题" value="single" />
            <a-option label="多选题" value="multiple" />
            <a-option label="判断题" value="judge" />
            <a-option label="问答题" value="subjective" />
          </a-select>
        </a-form-item>
        <a-form-item label="难度">
          <a-select v-model="questionForm.difficulty">
            <a-option label="简单" value="easy" />
            <a-option label="中等" value="medium" />
            <a-option label="困难" value="hard" />
          </a-select>
        </a-form-item>
        <a-form-item label="分值">
          <a-input-number v-model="questionForm.score" :min="1" :max="100" />
        </a-form-item>
        <a-form-item label="选项" v-if="questionForm.type !== 'subjective'">
          <div v-for="(opt, idx) in questionForm.options" :key="idx" style="display: flex; margin-bottom: 5px">
            <a-input v-model="opt.key" placeholder="A" style="width: 60px" />
            <a-input v-model="opt.value" placeholder="选项内容" style="margin-left: 5px" />
            <a-button type="danger" @click="questionForm.options.splice(idx, 1)" style="margin-left: 5px">-</a-button>
          </div>
          <a-button size="small" @click="questionForm.options.push({ key: '', value: '' })">+ 添加选项</a-button>
        </a-form-item>
        <a-form-item label="正确答案">
          <a-input v-model="questionForm.answer" placeholder="单选/判断: A 或 true/false; 多选: A,B" />
        </a-form-item>
        <a-form-item label="解析">
          <a-textarea v-model="questionForm.explanation" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="showImport" title="批量导入题目" :width="500" @before-ok="batchImport" @cancel="showImport = false" :ok-text="'导入'" :cancel-text="'取消'">
      <a-alert>
        <template #title>
          <strong>格式说明：</strong>
        </template>
        每行一道题，格式如下：
        单选：题目内容|A|B|C|D|A
        多选：题目内容|A|B|C|D|AB
        判断：题目内容|对|错|对
        问答：题目内容||||||||答案
      </a-alert>
      <a-textarea v-model="importText" :rows="10" placeholder="请按格式输入题目..." style="margin-top: 15px" />
    </a-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { getPaper, getPaperQuestions, addQuestionsToPaper, removeQuestionFromPaper, createQuestion, getQuestions, createPaper } from '@/api'

export default {
  name: 'PaperQuestions',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const paperId = route.params.id
    const paper = ref(null)
    const paperQuestions = ref([])
    const allQuestions = ref([])
    const searchText = ref('')

    const showAddFromBank = ref(false)
    const showNewQuestion = ref(false)
    const showImport = ref(false)
    const selectedQuestions = ref([])
    const importText = ref('')

    const questionForm = ref({
      title: '', type: 'single', difficulty: 'medium', score: 10,
      options: [{ key: 'A', value: '' }, { key: 'B', value: '' }], answer: '', explanation: ''
    })

    const totalScore = computed(() => {
      return paperQuestions.value.reduce((sum, q) => sum + (q.score || 0), 0)
    })

    const filteredQuestions = computed(() => {
      if (!searchText.value) return allQuestions.value
      return allQuestions.value.filter(q => q.title.includes(searchText.value))
    })

    const goBack = () => {
      router.push('/dashboard')
    }

    const loadPaper = async () => {
      try {
        const res = await getPaper(paperId)
        paper.value = res.data
      } catch (e) { Message.error('加载试卷失败') }
    }

    const loadPaperQuestions = async () => {
      try {
        const res = await getPaperQuestions(paperId)
        paperQuestions.value = res.data?.list || []
      } catch (e) { Message.error('加载题目失败') }
    }

    const loadAllQuestions = async () => {
      try {
        const res = await getQuestions({ pageSize: 100 })
        const usedIds = new Set(paperQuestions.value.map(q => q.id))
        allQuestions.value = (res.data?.list || []).filter(q => !usedIds.has(q.id))
      } catch (e) { Message.error('加载题库失败: ' + (e.message || '未知错误')) }
    }

    const handleSelection = (selection) => {
      selectedQuestions.value = selection
    }

    const toggleQuestionSelection = (q) => {
      const idx = selectedQuestions.value.findIndex(s => s.id === q.id)
      if (idx >= 0) {
        selectedQuestions.value.splice(idx, 1)
      } else {
        selectedQuestions.value.push(q)
      }
    }

    const addFromBank = () => {
      (async () => {
        if (selectedQuestions.value.length === 0) {
          Message.warning('请先选择要添加的题目')
          return
        }

        Modal.confirm({
          title: '确认添加题目',
          content: `确定要将选中的 ${selectedQuestions.value.length} 道题目添加到试卷中吗？`,
          okText: '确认添加',
          cancelText: '取消',
          type: 'info',
          onOk: async () => {
            try {
              const loadingMsg = Message.loading({
                content: `正在添加 ${selectedQuestions.value.length} 道题目到试卷...`,
                duration: 0
              })

              const questionIds = selectedQuestions.value.map(q => q.id)
              const res = await addQuestionsToPaper(paperId, questionIds)

              loadingMsg.close()

              if (res && res.success !== false) {
                Message.success({
                  content: `✅ 成功添加 ${questionIds.length} 道题目到试卷`,
                  duration: 3000,
                  closable: true
                })

                showAddFromBank.value = false
                selectedQuestions.value = []
                loadPaperQuestions()
                loadAllQuestions()
              } else {
                throw new Error(res?.message || '添加失败')
              }
            } catch (e) {
              console.error('添加题目失败:', e)
              let errorMsg = '添加失败'
              
              try {
                if (e && typeof e === 'object') {
                  errorMsg = (e.response && e.response.data && e.response.data.message) 
                    || e.message 
                    || JSON.stringify(e).substring(0, 100)
                } else if (typeof e === 'string') {
                  errorMsg = e
                }
              } catch (parseErr) {
                errorMsg = '添加失败（未知错误）'
              }

              Message.error({
                content: `❌ 添加失败: ${errorMsg}`,
                duration: 5000,
                closable: true
              })
            }
          }
        })
      })()
    }

    const removeQuestion = async (questionId) => {
      Modal.confirm({
        title: '确认移除',
        content: '确定要从试卷中移除这道题吗？此操作不可撤销。',
        okText: '确认移除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await removeQuestionFromPaper(paperId, questionId)
            Message.success('移除成功')
            loadPaperQuestions()
            loadAllQuestions()
          } catch (e) {
            Message.error(e.message || '移除失败')
          }
        }
      })
    }

    const createQuestionAndAdd = async (done) => {
      try {
        const data = { ...questionForm.value }
        if (data.type === 'multiple') {
          data.answer = data.answer.split(',').map(a => a.trim())
        }
        const res = await createQuestion(data)

        await addQuestionsToPaper(paperId, [res.data.id])

        Message.success('创建成功并已添加到试卷')
        showNewQuestion.value = false
        questionForm.value = {
          title: '', type: 'single', difficulty: 'medium', score: 10,
          options: [{ key: 'A', value: '' }, { key: 'B', value: '' }], answer: '', explanation: ''
        }
        loadPaperQuestions()
        loadAllQuestions()
        done(true)
      } catch (e) {
        console.error('创建题目失败:', e)
        Message.error('创建失败: ' + (e.message || e.toString()))
        done(false)
      }
    }

    const batchImport = (done) => {
      (async () => {
        if (!importText.value.trim()) {
          Message.warning('请输入题目')
          done(false)
          return
        }
        try {
          const lines = importText.value.trim().split('\n')
          let successCount = 0

          for (const line of lines) {
            const parts = line.split('|')
            if (parts.length < 2) continue

            const title = parts[0].trim()
            if (!title) continue

            let type = 'single'
            let answer = ''
            let options = []

            if (parts.length >= 6 && parts[5]) {
              type = 'multiple'
              answer = parts[5]
              options = [
                { key: 'A', value: parts[1] },
                { key: 'B', value: parts[2] },
                { key: 'C', value: parts[3] },
                { key: 'D', value: parts[4] }
              ].filter(o => o.value)
            } else if (title.includes('判断') || parts.length === 3) {
              type = 'judge'
              answer = parts[2] === '对' ? 'true' : 'false'
              options = [
                { key: 'true', value: parts[1] || '对' },
                { key: 'false', value: parts[2] || '错' }
              ]
            } else if (parts.length >= 5) {
              type = 'single'
              answer = parts[4]
              options = [
                { key: 'A', value: parts[1] },
                { key: 'B', value: parts[2] },
                { key: 'C', value: parts[3] },
                { key: 'D', value: parts[4] }
              ].filter(o => o.value)
            } else {
              type = 'subjective'
              answer = parts[1] || ''
            }

            const q = await createQuestion({
              title,
              type,
              difficulty: 'medium',
              score: 10,
              options,
              answer,
              explanation: ''
            })

            await addQuestionsToPaper(paperId, [q.data.id])
            successCount++
          }

          Message.success(`成功导入 ${successCount} 道题目`)
          showImport.value = false
          importText.value = ''
          loadPaperQuestions()
          loadAllQuestions()
          done(true)
        } catch (e) {
          console.error(e)
          Message.error('导入失败，请检查格式')
          done(false)
        }
      })()
    }

    onMounted(async () => {
      await loadPaper()
      await loadPaperQuestions()
      await loadAllQuestions()
    })

    return {
      paperId,
      paper,
      paperQuestions,
      allQuestions,
      searchText,
      totalScore,
      filteredQuestions,
      showAddFromBank,
      showNewQuestion,
      showImport,
      selectedQuestions,
      questionForm,
      importText,
      goBack,
      handleSelection,
      toggleQuestionSelection,
      addFromBank,
      removeQuestion,
      createQuestion: createQuestionAndAdd,
      batchImport
    }
  }
}
</script>

<style scoped>
.paper-questions {
  min-height: 100vh;
  background: var(--bg-color);
  padding: 24px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-color-white);
  padding: 14px 20px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  margin-bottom: 20px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-right {
  display: flex;
  gap: 10px;
}

:deep(.arco-card) {
  border-radius: var(--radius-lg);
  border: none;
  box-shadow: var(--shadow-card);
}
:deep(.arco-card__header) {
  background: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color-light);
  padding: 14px 20px;
  font-weight: 500;
  color: var(--text-primary);
}
:deep(.arco-card__body) {
  padding: 16px 20px;
}
:deep(.arco-table) {
  border-radius: var(--radius-base);
}
:deep(.arco-table-th) {
  background: var(--bg-color) !important;
  font-weight: 500;
  color: var(--text-regular);
}
:deep(.arco-table-tr:hover > td) {
  background: var(--bg-color-hover) !important;
}
:deep(.arco-tag) {
  border-radius: var(--radius-sm) !important;
  padding: 0 6px !important;
}
:deep(.arco-btn--secondary) {
  border-radius: var(--radius-base);
  padding: 7px 12px;
}
:deep(.arco-btn--primary) {
  border-radius: var(--radius-base);
}
:deep(.arco-btn--success) {
  border-radius: var(--radius-base);
}
:deep(.arco-modal) {
  border-radius: var(--radius-lg) !important;
}
:deep(.arco-modal__header) {
  border-bottom: 1px solid var(--border-color-light);
  padding-bottom: 14px;
  font-weight: 500;
}
:deep(.arco-input-wrapper) {
  border-radius: var(--radius-base) !important;
  padding: 10px 14px !important;
}
:deep(.arco-alert) {
  border-radius: var(--radius-base);
}
</style>