<template>
  <div class="page-view">
    <!-- 页面头部 -->
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">题库管理</h1>
          <p class="page-desc">管理考试题目，支持单选、多选、判断等题型</p>
        </div>
      </div>
    </div>
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-button type="primary" @click="showQuestionDialog = true">+ 新建题目</a-button>
        <a-button @click="showImportDialog = true">批量导入</a-button>
        <a-button @click="showCategoryDialog = true">类别管理</a-button>
        <a-button v-if="selectedIds.length > 0" status="danger" @click="batchDeleteQuestions">
          <template #icon><icon-delete /></template>
          删除选中 ({{ selectedIds.length }})
        </a-button>
        <div class="search-wrapper">
          <a-input v-model="questionSearch" placeholder="搜索题目内容..." style="width: 200px" allow-clear>
            <template #prefix><icon-search /></template>
          </a-input>
          <a-select v-model="searchType" placeholder="题型" style="width: 100px" @change="questionPage = 1" allow-clear>
            <a-option value="single">单选</a-option>
            <a-option value="multiple">多选</a-option>
            <a-option value="judge">判断</a-option>
            <a-option value="subjective">问答</a-option>
          </a-select>
          <a-select v-model="searchDifficulty" placeholder="难度" style="width: 100px" @change="questionPage = 1" allow-clear>
            <a-option value="easy">简单</a-option>
            <a-option value="medium">中等</a-option>
            <a-option value="hard">困难</a-option>
          </a-select>
          <a-button @click="resetSearch" v-if="questionSearch || searchType || searchDifficulty">
            <template #icon><icon-refresh /></template>
            重置
          </a-button>
        </div>
      </div>
    </div>
    <a-card class="content-card">
      <a-tabs v-model:active-key="activeCategory" @change="questionPage = 1">
        <a-tab-pane key="all" title="全部">
          <div style="overflow-x: auto; max-width: 100%;">
            <table class="data-table" style="min-width: 680px;">
              <thead>
                <tr>
                  <th style="width: 50px; min-width: 50px;">
                    <a-checkbox :model-value="isAllSelected" :indeterminate="isIndeterminate" @change="toggleSelectAll" />
                  </th>
                  <th style="width: 60px; min-width: 60px;">ID</th>
                  <th style="min-width: 200px;">题目内容</th>
                  <th style="width: 80px; min-width: 80px;">类型</th>
                  <th style="width: 80px; min-width: 80px;">难度</th>
                  <th style="width: 60px; min-width: 60px;">分值</th>
                  <th style="width: 120px; min-width: 120px;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="questionsLoading">
                  <td colspan="7">
                    <a-skeleton :animation="true">
                      <a-skeleton-line :widths="['100%', '80%', '60%', '70%', '50%']" :rows="5" />
                    </a-skeleton>
                  </td>
                </tr>
                <tr v-else-if="paginatedQuestions.length === 0">
                  <td colspan="7">
                    <a-empty description="暂无题目" />
                  </td>
                </tr>
                <tr v-else v-for="(q, index) in paginatedQuestions" :key="q.id">
                  <td><a-checkbox :model-value="selectedIds.includes(q.id)" @change="(val) => toggleSelect(q.id, val)" /></td>
                  <td>{{ (questionPage - 1) * questionPageSize + index + 1 }}</td>
                  <td class="title-cell" v-html="q.title"></td>
                  <td>
                    <span v-if="q.type === 'single'" class="tag tag-blue">单选</span>
                    <span v-else-if="q.type === 'multiple'" class="tag tag-orange">多选</span>
                    <span v-else-if="q.type === 'judge'" class="tag tag-gray">判断</span>
                    <span v-else class="tag tag-green">问答</span>
                  </td>
                  <td>
                    <span v-if="q.difficulty === 'easy'" class="tag tag-green">简单</span>
                    <span v-else-if="q.difficulty === 'medium'" class="tag tag-orange">中等</span>
                    <span v-else class="tag tag-red">困难</span>
                  </td>
                  <td>{{ q.score }}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                      <a-link @click="editQuestion(q)">编辑</a-link>
                      <a-button type="text" status="danger" size="small" @click="deleteQuestion(q.id)">删除</a-button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination" v-if="totalQuestionPages > 1">
            <span class="page-info">共 {{ filteredQuestions.length }} 条</span>
            <a-select v-model="questionPageSize" style="width: 80px" @change="questionPage = 1">
              <a-option :value="10">10 条</a-option>
              <a-option :value="15">15 条</a-option>
              <a-option :value="20">20 条</a-option>
              <a-option :value="50">50 条</a-option>
            </a-select>
            <span class="page-btn" @click="questionPage = 1">首页</span>
            <span class="page-btn" @click="questionPage > 1 && questionPage--">上一页</span>
            <span class="page-current">{{ questionPage }} / {{ totalQuestionPages }}</span>
            <span class="page-btn" @click="questionPage < totalQuestionPages && questionPage++">下一页</span>
            <span class="page-btn" @click="questionPage = totalQuestionPages">末页</span>
          </div>
        </a-tab-pane>
        <a-tab-pane v-for="c in categories" :key="String(c.id)" :title="c.name">
          <div style="overflow-x: auto; max-width: 100%;">
            <table class="data-table" style="min-width: 680px;">
              <thead>
                <tr>
                  <th style="width: 50px; min-width: 50px;">
                    <a-checkbox :model-value="isAllSelected" :indeterminate="isIndeterminate" @change="toggleSelectAll" />
                  </th>
                  <th style="width: 60px; min-width: 60px;">ID</th>
                  <th style="min-width: 200px;">题目内容</th>
                  <th style="width: 80px; min-width: 80px;">类型</th>
                  <th style="width: 80px; min-width: 80px;">难度</th>
                  <th style="width: 60px; min-width: 60px;">分值</th>
                  <th style="width: 120px; min-width: 120px;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="questionsLoading">
                  <td colspan="7">
                    <a-skeleton :animation="true">
                      <a-skeleton-line :widths="['100%', '80%', '60%', '70%', '50%']" :rows="5" />
                    </a-skeleton>
                  </td>
                </tr>
                <tr v-else-if="paginatedQuestions.length === 0">
                  <td colspan="7">
                    <a-empty description="暂无题目" />
                  </td>
                </tr>
                <tr v-else v-for="(q, index) in paginatedQuestions" :key="q.id">
                  <td><a-checkbox :model-value="selectedIds.includes(q.id)" @change="(val) => toggleSelect(q.id, val)" /></td>
                  <td>{{ (questionPage - 1) * questionPageSize + index + 1 }}</td>
                  <td class="title-cell" v-html="q.title"></td>
                  <td>
                    <span v-if="q.type === 'single'" class="tag tag-blue">单选</span>
                    <span v-else-if="q.type === 'multiple'" class="tag tag-orange">多选</span>
                    <span v-else-if="q.type === 'judge'" class="tag tag-gray">判断</span>
                    <span v-else class="tag tag-green">问答</span>
                  </td>
                  <td>
                    <span v-if="q.difficulty === 'easy'" class="tag tag-green">简单</span>
                    <span v-else-if="q.difficulty === 'medium'" class="tag tag-orange">中等</span>
                    <span v-else class="tag tag-red">困难</span>
                  </td>
                  <td>{{ q.score }}</td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                      <a-link @click="editQuestion(q)">编辑</a-link>
                      <a-button type="text" status="danger" size="small" @click="deleteQuestion(q.id)">删除</a-button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination" v-if="totalQuestionPages > 1">
            <span class="page-info">共 {{ filteredQuestions.length }} 条</span>
            <a-select v-model="questionPageSize" style="width: 80px" @change="questionPage = 1">
              <a-option :value="10">10 条</a-option>
              <a-option :value="15">15 条</a-option>
              <a-option :value="20">20 条</a-option>
              <a-option :value="50">50 条</a-option>
            </a-select>
            <span class="page-btn" @click="questionPage = 1">首页</span>
            <span class="page-btn" @click="questionPage > 1 && questionPage--">上一页</span>
            <span class="page-current">{{ questionPage }} / {{ totalQuestionPages }}</span>
            <span class="page-btn" @click="questionPage < totalQuestionPages && questionPage++">下一页</span>
            <span class="page-btn" @click="questionPage = totalQuestionPages">末页</span>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 新建/编辑题目对话框 -->
    <a-modal v-model:visible="showQuestionDialog" :title="editingQuestion ? '编辑题目' : '新建题目'" :width="640" @before-ok="saveQuestion" @cancel="showQuestionDialog = false" :ok-text="'保存'" :cancel-text="'取消'">
      <div class="question-form">
        <a-form :model="questionForm" layout="vertical">
          <a-form-item label="题目内容">
            <a-textarea v-model="questionForm.title" :rows="3" placeholder="请输入题目内容" />
          </a-form-item>
          <div class="form-row">
            <a-form-item label="题目类型">
              <a-select v-model="questionForm.type">
                <a-option value="single">单选题</a-option>
                <a-option value="multiple">多选题</a-option>
                <a-option value="judge">判断题</a-option>
                <a-option value="subjective">问答题</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="所属类别">
              <a-select v-model="questionForm.category_id" placeholder="选择类别（可选）" allow-clear>
                <a-option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="难度">
              <a-select v-model="questionForm.difficulty">
                <a-option value="easy">简单</a-option>
                <a-option value="medium">中等</a-option>
                <a-option value="hard">困难</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="分值">
              <a-input-number v-model="questionForm.score" :min="1" :max="100" />
            </a-form-item>
          </div>
          <template v-if="questionForm.type !== 'subjective'">
            <a-form-item label="选项" class="options-label">
              <div class="options-wrapper">
                <div class="options-list">
                  <div v-for="(opt, idx) in questionForm.options" :key="idx" class="option-item">
                    <a-tag class="option-key-tag">{{ opt.key }}</a-tag>
                    <a-input v-model="opt.value" placeholder="请输入选项内容" class="option-input" allow-clear />
                    <a-button type="text" status="danger" class="option-delete" @click="questionForm.options.splice(idx, 1)" v-if="questionForm.options.length > 2">
                      <icon-delete />
                    </a-button>
                  </div>
                </div>
                <a-button type="dashed" class="add-option-btn" @click="questionForm.options.push({ key: String.fromCharCode(65 + questionForm.options.length), value: '' })" v-if="questionForm.type !== 'subjective' && questionForm.options.length < 7">
                  <icon-plus />
                  添加选项
                </a-button>
              </div>
            </a-form-item>
            <a-form-item label="正确答案" class="answer-label">
              <a-select v-if="questionForm.type === 'single' || questionForm.type === 'judge'" v-model="questionForm.answer" placeholder="选择正确答案">
                <a-option v-for="opt in questionForm.options" :key="opt.key" :value="opt.key">{{ opt.key }} - {{ opt.value || '选项' + opt.key }}</a-option>
              </a-select>
              <a-select v-else v-model="questionForm.answer" multiple placeholder="多选请选择多个答案">
                <a-option v-for="opt in questionForm.options" :key="opt.key" :value="opt.key">{{ opt.key }} - {{ opt.value || '选项' + opt.key }}</a-option>
              </a-select>
            </a-form-item>
          </template>
          <a-form-item label="答案解析">
            <a-textarea v-model="questionForm.explanation" :rows="2" placeholder="可选，添加题目解析有助于学员理解" />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 批量导入对话框 -->
    <a-modal v-model:visible="showImportDialog" title="批量导入题目" :width="600" @cancel="showImportDialog = false" :footer="null">
      <div style="padding: 20px 0">
        <a-alert type="info" style="margin-bottom: 16px">
          <template #title>
            <span style="font-weight: 600">导入说明</span>
          </template>
          <div style="font-size: 13px; line-height: 1.8">
            <div><strong>题型说明：</strong></div>
            <div style="margin-left: 12px; margin-bottom: 8px">
              • single - 单选题（需要填写选项A-D和正确答案）<br>
              • multiple - 多选题（多个正确答案用无间隔字符连接，如"AC"）<br>
              • judge - 判断题（正确答案填写 true 或 false）<br>
              • subjective - 问答题（只需填写题目内容和分值）
            </div>
            <div><strong>难度等级：</strong>easy（简单）/ medium（中等）/ hard（困难）</div>
            <div><strong>注意事项：</strong></div>
            <div style="margin-left: 12px">
              • 类别名称需与系统中已存在的类别匹配<br>
              • 多选题正确答案格式：如同时选A和C，填写"AC"<br>
              • 判断题正确答案为 true（正确）或 false（错误）<br>
              • Excel中请勿合并单元格，保持数据格式整洁
            </div>
          </div>
        </a-alert>
        
        <div style="display: flex; gap: 12px; margin-bottom: 20px">
          <a-button @click="downloadTemplate">
            <template #icon><icon-download /></template>
            下载模板
          </a-button>
          <a-upload :custom-request="handleImportQuestions" :show-file-list="false" accept=".xlsx,.xls">
            <a-button type="primary">
              <template #icon><icon-upload /></template>
              选择 Excel 文件
            </a-button>
          </a-upload>
        </div>
        
        <div v-if="importResult" :class="['import-result', importResult.success ? 'import-success' : 'import-error']">
          <a-result :status="importResult.success ? 'success' : 'error'" :title="importResult.title" :sub-title="importResult.subtitle">
            <template #extra>
              <a-space>
                <a-button @click="importResult = null">关闭</a-button>
                <a-button type="primary" @click="showImportDialog = false; loadQuestions()">查看题库</a-button>
              </a-space>
            </template>
          </a-result>
        </div>
        
        <div v-if="importing" style="text-align: center; padding: 40px 0">
          <a-spin tip="导入中，请稍候..." />
        </div>
      </div>
    </a-modal>

    <!-- 类别管理对话框 -->
    <a-modal v-model:visible="showCategoryDialog" title="类别管理" :width="500" @cancel="showCategoryDialog = false" :footer="null">
      <div style="margin-bottom: 16px;">
        <a-input v-model="newCategoryName" placeholder="输入新类别名称" style="width: 200px; margin-right: 8px;" />
        <a-button type="primary" size="small" @click="handleAddCategory">添加</a-button>
      </div>
      <div v-if="categories.length > 0">
        <div v-for="cat in categories" :key="cat.id" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f0f0f0;">
          <span>{{ cat.name }}</span>
          <a-button type="text" status="danger" size="small" @click="handleDeleteCategory(cat.id)">删除</a-button>
        </div>
      </div>
      <div v-else style="text-align: center; padding: 30px; color: #999;">
        暂无类别
      </div>
    </a-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { getQuestions, createQuestion, updateQuestion, deleteQuestion as deleteQuestionApi, getCategories, createCategory, deleteCategory } from '../api'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import { IconSearch, IconRefresh, IconDownload, IconUpload, IconDelete, IconPlus } from '@arco-design/web-vue/es/icon'
import * as XLSX from 'xlsx'

export default {
  name: 'QuestionsPanel',
  components: { IconSearch, IconRefresh, IconDownload, IconUpload, IconDelete, IconPlus },
  emits: ['questionsUpdated'],
  setup(props, { emit }) {
    const questions = ref([])
    const questionsLoading = ref(false)
    const { keyword: questionSearch, debouncedKeyword: debouncedSearch } = useDebouncedSearch(300)
    const searchType = ref('')
    const searchDifficulty = ref('')
    const activeCategory = ref('all')
    const questionPage = ref(1)
    const questionPageSize = ref(8)
    const showQuestionDialog = ref(false)
    const showImportDialog = ref(false)
    const showCategoryDialog = ref(false)
    const newCategoryName = ref('')
    const categories = ref([])
    const editingQuestion = ref(null)
    const selectedIds = ref([])
    const questionForm = ref({
      title: '', type: 'single', difficulty: 'medium', score: 10,
      options: [{ key: 'A', value: '' }, { key: 'B', value: '' }], answer: '', explanation: '', category_id: null
    })
    const importing = ref(false)
    const importResult = ref(null)

    const filteredQuestions = computed(() => {
      let result = questions.value || []
      if (activeCategory.value !== 'all') {
        result = result.filter(q => String(q.category_id) === activeCategory.value)
      }
      if (debouncedSearch.value) {
        const kw = debouncedSearch.value.toLowerCase()
        result = result.filter(q => q.title.toLowerCase().includes(kw))
      }
      if (searchType.value) {
        result = result.filter(q => q.type === searchType.value)
      }
      if (searchDifficulty.value) {
        result = result.filter(q => q.difficulty === searchDifficulty.value)
      }
      return result
    })

    const paginatedQuestions = computed(() => {
      const start = (questionPage.value - 1) * questionPageSize.value
      return (filteredQuestions.value || []).slice(start, start + questionPageSize.value)
    })

    const totalQuestionPages = computed(() => Math.ceil((filteredQuestions.value || []).length / questionPageSize.value) || 1)

    const loadQuestions = async () => {
      questionsLoading.value = true
      try {
        const res = await getQuestions({ pageSize: 100 })
        if (res.data) {
          questions.value = res.data.list || res.data.questions || []
        }
      } catch (e) {
        console.error('加载题目失败:', e)
        Message.error('加载题目失败: ' + (e.message || '网络错误'))
      } finally {
        questionsLoading.value = false
      }
    }

    const loadCategories = async () => {
      try {
        const res = await getCategories()
        if (res.data) {
          categories.value = res.data
        }
      } catch (e) {
        console.error('加载类别失败', e)
        Message.error('加载类别失败: ' + (e.message || '网络错误'))
      }
    }

    const resetSearch = () => {
      questionSearch.value = ''
      searchType.value = ''
      searchDifficulty.value = ''
      questionPage.value = 1
    }

    const saveQuestion = (done) => {
      (async () => {
        try {
          const data = { ...questionForm.value }
          if (data.type === 'multiple') {
            data.answer = data.answer.split(',').map(a => a.trim())
          }
          if (editingQuestion.value) {
            await updateQuestion(editingQuestion.value.id, data)
            Message.success('更新成功')
          } else {
            await createQuestion(data)
            Message.success('创建成功')
          }
          showQuestionDialog.value = false
          loadQuestions()
          emit('questionsUpdated')
          done(true)
        } catch (e) {
          Message.error('操作失败')
          done(false)
        }
      })()
    }

    const editQuestion = (row) => {
      editingQuestion.value = row
      questionForm.value = {
        ...row,
        options: row.options || [{ key: 'A', value: '' }, { key: 'B', value: '' }]
      }
      showQuestionDialog.value = true
    }

    const deleteQuestion = (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这道题吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deleteQuestionApi(id)
            Message.success('删除成功')
            selectedIds.value = selectedIds.value.filter(sid => sid !== id)
            loadQuestions()
            emit('questionsUpdated')
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    const isAllSelected = computed(() => {
      if (filteredQuestions.value.length === 0) return false
      return filteredQuestions.value.every(q => selectedIds.value.includes(q.id))
    })

    const isIndeterminate = computed(() => {
      if (filteredQuestions.value.length === 0) return false
      const selectedCount = filteredQuestions.value.filter(q => selectedIds.value.includes(q.id)).length
      return selectedCount > 0 && selectedCount < filteredQuestions.value.length
    })

    const toggleSelectAll = (val) => {
      if (val) {
        const newIds = [...selectedIds.value]
        filteredQuestions.value.forEach(q => {
          if (!newIds.includes(q.id)) newIds.push(q.id)
        })
        selectedIds.value = newIds
      } else {
        selectedIds.value = []
      }
    }

    const toggleSelect = (id, val) => {
      if (val) {
        if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
      } else {
        selectedIds.value = selectedIds.value.filter(sid => sid !== id)
      }
    }

    const batchDeleteQuestions = () => {
      if (selectedIds.value.length === 0) return
      Modal.confirm({
        title: '批量删除确认',
        content: `确定要删除选中的 ${selectedIds.value.length} 道题目吗？此操作不可撤销。`,
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        okButtonProps: { status: 'danger', loading: false },
        onOk: () => {
          return new Promise(async (resolve, reject) => {
            try {
              const loadingMsg = Message.loading({
                content: `正在删除 ${selectedIds.value.length} 道题目...`,
                duration: 0
              })
              let successCount = 0
              let failCount = 0
              
              for (const id of selectedIds.value) {
                try {
                  await deleteQuestionApi(id)
                  successCount++
                } catch (e) {
                  console.warn('删除题目失败:', id, e.message)
                  failCount++
                }
              }
              
              loadingMsg.close()
              
              if (failCount > 0) {
                Message.warning({ content: `成功删除 ${successCount} 道题目，失败 ${failCount} 道`, duration: 5000 })
              } else {
                Message.success(`成功删除 ${successCount} 道题目`)
              }
              
              selectedIds.value = []
              loadQuestions()
              emit('questionsUpdated')
              resolve(true)
            } catch (e) {
              Message.error(e.message || '批量删除失败')
              reject(e)
            }
          })
        }
      })
    }

    const handleAddCategory = async () => {
      if (!newCategoryName.value.trim()) {
        Message.warning('请输入类别名称')
        return
      }
      try {
        await createCategory({ name: newCategoryName.value.trim() })
        Message.success('添加成功')
        newCategoryName.value = ''
        loadCategories()
      } catch (e) {
        Message.error('添加失败')
      }
    }

    const handleDeleteCategory = async (id) => {
      try {
        await deleteCategory(id)
        Message.success('删除成功')
        loadCategories()
      } catch (e) {
        Message.error('删除失败')
      }
    }

    const downloadTemplate = () => {
      const ws_data = [
        ['题目内容', '题型', '选项A', '选项B', '选项C', '选项D', '正确答案', '难度', '分值', '答案解析', '类别名称'],
        ['【第一行是表头，请从第二行开始填写】', '', '', '', '', '', '', '', '', '', ''],
        ['示例-单选题：JavaScript是什么类型的编程语言？', 'single', '编译型语言', '解释型语言', '汇编语言', '机器语言', 'B', 'medium', '10', 'JavaScript是一门解释型语言，代码不需要编译直接由浏览器解释执行', '编程语言'],
        ['示例-多选题：以下哪些是前端框架？', 'multiple', 'Vue', 'Django', 'React', 'Spring', 'AC', 'easy', '15', 'Vue和React是主流前端框架，Django和Spring是后端框架', '编程语言'],
        ['示例-判断题：Python是一种解释型语言', 'judge', '', '', '', '', 'true', 'easy', '5', 'Python确实是一种解释型语言', '编程语言'],
        ['示例-问答题：请简述HTTP和HTTPS的区别', 'subjective', '', '', '', '', '', 'medium', '20', 'HTTPS = HTTP + SSL/TLS加密传输，HTTP端口80，HTTPS端口443', '计算机基础'],
        ['【题型填写规范】single=单选 multiple=多选 judge=判断 subjective=问答', '', '', '', '', '', '', '', '', '', ''],
        ['【难度填写规范】easy=简单 medium=中等 hard=困难', '', '', '', '', '', '', '', '', '', ''],
        ['【多选题正确答案】如同时选AC则填写"AC"，同时选BCD则填写"BCD"（无间隔）', '', '', '', '', '', '', '', '', '', ''],
        ['【判断题正确答案】正确填写"true"，错误填写"false"', '', '', '', '', '', '', '', '', '', '']
      ]
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(ws_data)
      ws['!cols'] = [
        { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 35 }, { wch: 15 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, '题目导入模板')
      XLSX.writeFile(wb, '题目导入模板.xlsx')
    }

    const handleImportQuestions = async (options) => {
      const file = options.fileItem.file
      importing.value = true
      importResult.value = null

      try {
        if (!file) {
          throw new Error('无法读取文件，请选择有效的Excel文件')
        }
        const arrayBuffer = await file.arrayBuffer()
        const data = new Uint8Array(arrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

        const questionsData = jsonData.slice(1).filter(row => row[0] && row[0].toString().trim())

        if (questionsData.length === 0) {
          throw new Error('Excel 中没有有效的题目数据')
        }

        const questionsToImport = questionsData.map((row) => {
          const typeMap = { 'single': 'single', 'multiple': 'multiple', 'judge': 'judge', 'true/false': 'judge', 'subjective': 'subjective' }
          const difficultyMap = { 'easy': 'easy', 'medium': 'medium', 'hard': 'hard', '简单': 'easy', '中等': 'medium', '困难': 'hard' }

          let options = []
          if (row[1] === 'single' || row[1] === 'multiple') {
            options = [
              { key: 'A', value: row[2] || '' },
              { key: 'B', value: row[3] || '' },
              { key: 'C', value: row[4] || '' },
              { key: 'D', value: row[5] || '' }
            ].filter(opt => opt.value)
          }

          let answer = row[6] || ''
          if (row[1] === 'judge') {
            answer = (answer === 'true' || answer === '正确' || answer === 'T') ? 'true' : 'false'
          }

          return {
            title: row[0]?.toString() || '',
            type: typeMap[row[1]?.toString().toLowerCase()] || 'single',
            options: options,
            answer: answer,
            difficulty: difficultyMap[row[7]?.toString().toLowerCase()] || 'medium',
            score: parseInt(row[8]) || 10,
            explanation: row[9] || '',
            category_name: row[10]?.toString() || ''
          }
        })

        let successCount = 0
        let failCount = 0
        const errors = []

        for (const q of questionsToImport) {
          try {
            const postData = {
              title: q.title,
              type: q.type,
              options: q.options,
              answer: q.answer,
              difficulty: q.difficulty,
              score: q.score,
              explanation: q.explanation,
              status: 'draft'
            }

            await createQuestion(postData)
            successCount++
          } catch (e) {
            failCount++
            errors.push(`题目"${q.title.substring(0, 20)}..."导入失败：${e.message}`)
          }
        }

        importResult.value = {
          success: successCount > 0,
          title: successCount > 0 ? `成功导入${successCount}道题目` : '导入失败',
          subtitle: failCount > 0 ? ('失败' + failCount + '道' + (errors.length > 0 ? '\n' + errors.slice(0, 3).join('\n') : '')) : '所有题目已成功导入到题库'
        }
      } catch (e) {
        console.error('导入失败:', e)
        importResult.value = {
          success: false,
          title: '导入失败',
          subtitle: e.message || '文件解析失败，请检查文件格式是否正确'
        }
      } finally {
        importing.value = false
        options.onSuccess && options.onSuccess()
      }
    }

    // 组件挂载时自动加载数据
    onMounted(() => {
      loadQuestions()
      loadCategories()
    })

    // 暴露给父组件
    return {
      questions, questionsLoading, questionSearch, searchType, searchDifficulty,
      activeCategory, questionPage, questionPageSize, paginatedQuestions, filteredQuestions, totalQuestionPages,
      showQuestionDialog, showImportDialog, showCategoryDialog, newCategoryName,
      categories, editingQuestion, questionForm, importing, importResult,
      selectedIds, isAllSelected, isIndeterminate,
      loadQuestions, loadCategories, resetSearch, saveQuestion, editQuestion, deleteQuestion,
      toggleSelectAll, toggleSelect, batchDeleteQuestions,
      handleAddCategory, handleDeleteCategory, downloadTemplate, handleImportQuestions
    }
  }
}
</script>

<style scoped>
.question-form .options-label .arco-form-item-wrapper {
  margin-bottom: 0;
}
.question-form .options-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.question-form .options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.question-form .option-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.question-form .option-key-tag {
  flex-shrink: 0;
  width: 32px;
  text-align: center;
  font-weight: 600;
}
.question-form .option-input {
  flex: 1;
}
.question-form .option-delete {
  flex-shrink: 0;
  opacity: 0.6;
}
.question-form .option-delete:hover {
  opacity: 1;
}
.question-form .add-option-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
