<template>
  <div class="page-view">
    <!-- 页面头部 -->
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">试卷管理</h1>
          <p class="page-desc">创建和管理考试试卷，支持手动选题和随机组卷</p>
        </div>
      </div>
    </div>
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-button type="primary" @click="showPaperDialog = true">+ 新建试卷</a-button>
        <a-button @click="showRandomDialog = true">随机组卷</a-button>
      </div>
    </div>
    <a-card class="content-card">
      <div style="padding: 16px;">
        <table class="data-table">
          <thead>
            <tr>
              <th width="60">ID</th>
              <th>试卷标题</th>
              <th width="80">总分</th>
              <th width="80">时限</th>
              <th width="80">状态</th>
              <th width="100">考生范围</th>
              <th width="100">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="papersLoading">
              <td colspan="7">
                <a-skeleton :animation="true">
                  <a-skeleton-line :widths="['100%', '80%', '60%', '70%', '50%']" :rows="5" />
                </a-skeleton>
              </td>
            </tr>
            <tr v-else-if="paginatedPapers.length === 0">
              <td colspan="7">
                <a-empty description="暂无试卷" />
              </td>
            </tr>
            <tr v-else v-for="(p, index) in paginatedPapers" :key="p.id">
              <td>{{ (papersPage - 1) * papersPageSize + index + 1 }}</td>
              <td class="title-cell">
                <a-badge v-if="papersWithPendingGrading?.[p.id]" :count="papersWithPendingGrading[p.id]" :max-count="99" :number-style="{backgroundColor: '#f53f3f'}">
                  <span style="cursor: pointer" @click="$emit('goToGrading', p.id)">{{ p.title }}</span>
                </a-badge>
                <span v-else>{{ p.title }}</span>
              </td>
              <td>{{ p.total_score || 0 }}分</td>
              <td>{{ p.duration }}分钟</td>
              <td>
                <span v-if="p.status === 'published'" class="tag tag-green">已发布</span>
                <span v-else class="tag tag-gray">草稿</span>
              </td>
              <td>
                <span v-if="p.allow_all_users !== false" class="tag tag-green">开放</span>
                <span v-else class="tag tag-orange">指定考生</span>
              </td>
              <td>
                <div class="action-group">
                  <a-dropdown trigger="click" @click="togglePaperMenu(p)" :popup-visible="p._showMenu">
                    <a-button size="mini" type="text">
                      更多 <icon-down />
                    </a-button>
                    <template #content>
                      <a-doption @click="handlePaperCommand('questions', p); p._showMenu = false">题目管理</a-doption>
                      <a-doption v-if="p.status === 'published'" @click="handlePaperCommand('url', p); p._showMenu = false">考试地址</a-doption>
                      <a-doption v-if="p.status === 'published'" @click="handlePaperCommand('records', p); p._showMenu = false">查看记录</a-doption>
                      <a-doption v-if="p.status !== 'published' && p.question_count > 0" @click="handlePaperCommand('publish', p); p._showMenu = false">发布试卷</a-doption>
                      <a-doption v-if="p.status !== 'published' && (!p.question_count || p.question_count === 0)" disabled>发布试卷（暂无题目）</a-doption>
                      <a-doption v-if="p.status === 'published'" @click="handlePaperCommand('unpublish', p); p._showMenu = false">取消发布</a-doption>
                      <a-doption @click="handlePaperCommand('edit', p); p._showMenu = false">编辑试卷</a-doption>
                      <a-doption danger @click="handlePaperCommand('delete', p); p._showMenu = false">删除试卷</a-doption>
                    </template>
                  </a-dropdown>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="papers.length > papersPageSize" class="pagination">
          <a-select v-model="papersPageSize" style="width: 80px" @change="papersPage = 1">
            <a-option :value="8">8 条</a-option>
            <a-option :value="10">10 条</a-option>
            <a-option :value="15">15 条</a-option>
            <a-option :value="20">20 条</a-option>
          </a-select>
          <span class="page-btn" @click="papersPage = 1">首页</span>
          <span class="page-btn" @click="papersPage > 1 && papersPage--">上一页</span>
          <span class="page-current">{{ papersPage }} / {{ Math.ceil(papers.length / papersPageSize) }}</span>
          <span class="page-btn" @click="papersPage < Math.ceil(papers.length / papersPageSize) && papersPage++">下一页</span>
          <span class="page-btn" @click="papersPage = Math.ceil(papers.length / papersPageSize)">末页</span>
        </div>
      </div>
    </a-card>

    <!-- 新建/编辑试卷对话框 -->
    <a-modal v-model:visible="showPaperDialog" :title="editingPaper ? '编辑试卷' : '新建试卷'" :width="800" @before-ok="createNewPaper" @cancel="showPaperDialog = false" :ok-text="'保存'" :cancel-text="'取消'">
      <a-form :model="paperForm" layout="vertical">
        <a-form-item label="试卷标题" required>
          <a-input v-model="paperForm.title" placeholder="请输入试卷标题" />
        </a-form-item>
        <a-form-item label="试卷描述">
          <a-textarea v-model="paperForm.description" :rows="2" />
        </a-form-item>
        <a-form-item label="时间限制">
          <a-input-number v-model="paperForm.time_limit" :min="1" :max="300" />
          <span style="margin-left: 8px">分钟</span>
        </a-form-item>
        <a-form-item label="选项">
          <a-checkbox v-model="paperForm.shuffle">打乱题目顺序</a-checkbox>
          <a-checkbox v-model="paperForm.show_score">显示分数</a-checkbox>
          <a-checkbox v-model="paperForm.show_answer">显示答案</a-checkbox>
        </a-form-item>
        <a-form-item label="访问码">
          <a-input v-model="paperForm.access_code" placeholder="可选，设置访问码" />
        </a-form-item>
        <a-form-item label="IP限制">
          <a-select v-model="paperForm.ip_limit" placeholder="每个IP考试次数限制" style="width: 100%">
            <a-option :value="0">不限制</a-option>
            <a-option :value="1">每个IP只能考1次</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="考生范围">
          <a-checkbox v-model="paperForm.allow_all_users">开放给所有考生</a-checkbox>
          <span style="color: #888; font-size: 12px; margin-left: 8px">关闭则需要指定考生才能参加考试</span>
        </a-form-item>
        <a-form-item label="考试时间">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <a-date-picker v-model="paperForm.start_time" show-time format="YYYY-MM-DD HH:mm" placeholder="开始时间" style="width: 180px" />
            <span>至</span>
            <a-date-picker v-model="paperForm.end_time" show-time format="YYYY-MM-DD HH:mm" placeholder="结束时间" style="width: 180px" />
          </div>
          <span style="color: #888; font-size: 12px;">留空则不限制考试时间</span>
        </a-form-item>
        <a-form-item v-if="!paperForm.allow_all_users" label="指定考生">
          <div style="margin-bottom: 12px;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
              <a-button type="primary" size="small" @click="showStudentDialog = true">
                <template #icon><icon-plus /></template>
                添加考生
              </a-button>
              <a-button size="small" @click="showImportStudentDialog = true">
                <template #icon><icon-upload /></template>
                批量导入
              </a-button>
              <a-button size="small" @click="handleExportStudents" :disabled="paperStudents.length === 0">
                <template #icon><icon-download /></template>
                导出名单
              </a-button>
            </div>
            <div v-if="paperStudents.length > 0" style="border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden;">
              <div style="max-height: 200px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <thead style="position: sticky; top: 0; z-index: 1;">
                    <tr style="background: #f7f8fa;">
                      <th style="padding: 10px 8px; text-align: left; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5;">考生号</th>
                      <th style="padding: 10px 8px; text-align: left; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5;">姓名</th>
                      <th style="padding: 10px 8px; text-align: left; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5;">手机</th>
                      <th style="padding: 10px 8px; text-align: center; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5; width: 70px;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="student in paperStudents" :key="student.id">
                      <td style="padding: 10px 8px; color: #666; border-bottom: 1px solid #f0f0f0;">{{ student.student_no }}</td>
                      <td style="padding: 10px 8px; color: #333; border-bottom: 1px solid #f0f0f0;">{{ student.name }}</td>
                      <td style="padding: 10px 8px; color: #666; border-bottom: 1px solid #f0f0f0;">{{ student.phone || '-' }}</td>
                      <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                        <a-button type="text" status="danger" size="small" @click="removeStudentFromPaper(student.id)">移除</a-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else style="text-align: center; padding: 30px 20px; color: #999; background: #fafafa; border-radius: 4px; border: 1px dashed #ddd;">
              暂无考生，请添加或导入
            </div>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 随机组卷对话框 -->
    <a-modal v-model:visible="showRandomDialog" title="随机组卷" :width="500" @before-ok="createRandomPaperAction" @cancel="showRandomDialog = false" :ok-text="'创建'" :cancel-text="'取消'">
      <a-form :model="randomForm" layout="vertical">
        <a-form-item label="试卷标题" required>
          <a-input v-model="randomForm.title" placeholder="请输入试卷标题" />
        </a-form-item>
        <a-form-item label="题目数量">
          <a-input-number v-model="randomForm.count" :min="1" :max="100" />
        </a-form-item>
        <a-form-item label="题目范围">
          <a-select v-model="randomForm.category_ids" multiple placeholder="选择类别（不选则从全部题目中抽取）">
            <a-option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="题目类型">
          <a-select v-model="randomForm.question_types" multiple placeholder="选择题目类型（不选则包含所有类型）">
            <a-option value="single">单选题</a-option>
            <a-option value="multiple">多选题</a-option>
            <a-option value="judge">判断题</a-option>
            <a-option value="subjective">问答题</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间限制">
          <a-input-number v-model="randomForm.time_limit" :min="1" :max="300" />
          <span style="margin-left: 8px">分钟</span>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 考试地址对话框 -->
    <a-modal v-model:visible="showExamUrlDialog" title="考试地址" :width="360" @cancel="showExamUrlDialog = false" :footer="null">
      <div v-if="examUrlData.access_url" class="exam-url-content">
        <p class="url-tip">考生扫描二维码或复制链接参加考试</p>
        <div class="qr-wrapper">
          <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(examUrlData.access_url)" alt="QR Code" />
        </div>
        <a-input :model-value="examUrlData.access_url" readonly style="width: 100%">
          <template #append>
            <a-button @click="copyUrl">复制</a-button>
          </template>
        </a-input>
      </div>
      <a-empty v-else description="暂无考试地址" />
    </a-modal>

    <!-- 考试记录对话框 -->
    <a-modal v-model:visible="showRecordsDialog" title="考试记录" :width="900" @cancel="showRecordsDialog = false">
      <div v-if="examRecordsStats" style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <span style="margin-right: 24px">平均分：<strong>{{ examRecordsStats.avg_score ?? '-' }}</strong></span>
        <span style="margin-right: 24px">最高分：<strong>{{ examRecordsStats.max_score ?? '-' }}</strong></span>
        <span>总计：<strong>{{ examRecordsStats.total }}</strong> 人</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>学员</th>
            <th width="80">分数</th>
            <th width="100">状态</th>
            <th width="160">交卷时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in examRecords" :key="r.id">
            <td>{{ r.student_name }}</td>
            <td>{{ r.percentage ?? '-' }}%</td>
            <td>
              <span v-if="r.status === 'submitted'" class="tag tag-green">已提交</span>
              <span v-else-if="r.status === 'graded'" class="tag tag-blue">已评分</span>
              <span v-else class="tag tag-gray">进行中</span>
            </td>
            <td>{{ r.end_time ? new Date(r.end_time).toLocaleString() : '-' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="examRecordsPagination && examRecordsPagination.totalPages > 1" style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #666">共 {{ examRecordsPagination.total }} 条</span>
        <a-pagination
          v-model:current="examRecordsPage"
          :total="examRecordsPagination.total"
          :page-size="examRecordsPagination.pageSize"
          size="small"
          @change="handleExamRecordsPageChange"
        />
      </div>
    </a-modal>

    <!-- 添加考生对话框 -->
    <a-modal v-model:visible="showStudentDialog" title="添加考生" :width="500" @before-ok="addStudent" @cancel="showStudentDialog = false" :ok-text="'添加'" :cancel-text="'取消'">
      <a-form :model="studentForm" layout="vertical">
        <a-form-item label="考生姓名" required>
          <a-input v-model="studentForm.name" placeholder="请输入考生姓名" />
        </a-form-item>
        <a-form-item label="手机号码">
          <a-input v-model="studentForm.phone" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量导入考生对话框 -->
    <a-modal v-model:visible="showImportStudentDialog" title="批量导入考生" :width="500" @cancel="showImportStudentDialog = false" :footer="null">
      <div style="text-align: center; padding: 20px 0">
        <a-upload :custom-request="handleImportStudents" :show-file-list="false" accept=".xlsx,.xls">
          <a-button type="primary">
            <template #icon><icon-upload /></template>
            选择Excel文件
          </a-button>
        </a-upload>
        <p style="color: var(--text-secondary); font-size: 13px; margin-top: 12px">
          Excel格式：考生姓名（必填）、考生手机（可选）
        </p>
        <p style="color: var(--text-secondary); font-size: 12px">
          支持 .xlsx 和 .xls 文件
        </p>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { getPapers, createPaper, publishPaper, unpublishPaper, deletePaper as deletePaperApi, getPaperExamUrl, getExamRecords, getPaperStudents, addPaperStudents, removePaperStudent, createStudent, exportPaperStudents, importStudents, createRandomPaper } from '../api'
import { IconDown, IconPlus, IconUpload, IconDownload } from '@arco-design/web-vue/es/icon'
import { EXAM_CONFIG } from '@/config/constants'

export default {
  name: 'PapersPanel',
  components: { IconDown, IconPlus, IconUpload, IconDownload },
  props: {
    papersWithPendingGrading: { type: Object, default: () => ({}) },
    categories: { type: Array, default: () => [] }
  },
  emits: ['goToGrading', 'papersUpdated'],
  setup(props, { emit }) {
    const papers = ref([])
    const papersLoading = ref(false)
    const papersPage = ref(1)
    const papersPageSize = ref(8)
    const showPaperDialog = ref(false)
    const showRandomDialog = ref(false)
    const editingPaper = ref(null)
    const randomForm = ref({ title: '', count: 10, time_limit: 60, category_ids: [], question_types: [] })
    const paperForm = ref({ title: '', description: '', time_limit: 60, shuffle: false, show_score: true, show_answer: true, access_code: '', ip_limit: 0, allow_all_users: true, start_time: null, end_time: null })
    const showStudentDialog = ref(false)
    const showImportStudentDialog = ref(false)
    const studentForm = ref({ name: '', phone: '' })
    const paperStudents = ref([])
    const showExamUrlDialog = ref(false)
    const examUrlData = ref({})
    const showRecordsDialog = ref(false)
    const examRecords = ref([])
    const examRecordsStats = ref(null)
    const examRecordsPagination = ref(null)
    const examRecordsPage = ref(1)
    const examRecordsCurrentPaperId = ref(null)

    const paginatedPapers = computed(() => {
      const startIndex = (papersPage.value - 1) * papersPageSize.value
      return (papers.value || []).slice(startIndex, startIndex + papersPageSize.value)
    })

    const loadPapers = async () => {
      papersLoading.value = true
      try {
        const res = await getPapers({ pageSize: 100 })
        if (res.data) {
          const paperList = res.data.list || res.data.papers || []
          papers.value = paperList.map(p => ({ ...p, _showMenu: false }))
        }
      } catch (e) {
        console.error('加载试卷失败:', e)
        Message.error('加载试卷失败: ' + (e.message || '网络错误'))
      } finally {
        papersLoading.value = false
      }
    }

    const togglePaperMenu = (p) => {
      papers.value.forEach(item => {
        item._showMenu = item.id === p.id ? !item._showMenu : false
      })
    }

    const closeAllPaperMenus = () => {
      papers.value.forEach(item => { item._showMenu = false })
    }

    const publishPaperAction = async (id) => {
      try {
        const res = await publishPaper(id)
        Message.success('发布成功')
        if (res.data?.access_url) {
          Modal.info({ title: '发布成功', content: `试卷已发布！访问链接: ${res.data.access_url}` })
        }
        loadPapers()
        emit('papersUpdated')
      } catch (e) {
        Message.error(e.response?.data?.message || '发布失败')
      }
    }

    const unpublishPaperAction = async (id) => {
      try {
        await unpublishPaper(id)
        Message.success('取消发布成功')
        loadPapers()
      } catch (e) {
        Message.error('操作失败')
      }
    }

    const deletePaperAction = async (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这份试卷吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deletePaperApi(id)
            Message.success('删除成功')
            loadPapers()
            emit('papersUpdated')
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    const createRandomPaperAction = (done) => {
      (async () => {
        try {
          await createRandomPaper(randomForm.value)
          Message.success('随机组卷成功')
          showRandomDialog.value = false
          randomForm.value = { title: '', count: 10, time_limit: 60, category_ids: [], question_types: [] }
          loadPapers()
          emit('papersUpdated')
          done(true)
        } catch (e) {
          Message.error(e.message || '组卷失败')
          done(false)
        }
      })()
    }

    const createNewPaper = (done) => {
      (async () => {
        try {
          const data = { ...paperForm.value }
          if (!data.title) {
            Message.warning('请输入试卷标题')
            return done(false)
          }
          const res = await createPaper(data)
          // 添加考生
          const studentIds = paperStudents.value.map(s => s.id)
          if (studentIds.length > 0 && res.data?.id) {
            try {
              await addPaperStudents(res.data.id, studentIds)
            } catch (e) { console.error('添加考生失败:', e) }
          }
          Message.success('创建成功')
          showPaperDialog.value = false
          loadPapers()
          emit('papersUpdated')
          done(true)
        } catch (e) {
          Message.error(e.message || '创建失败')
          done(false)
        }
      })()
    }

    const addStudent = (done) => {
      (async () => {
        try {
          if (!studentForm.value.name) {
            Message.warning('请输入考生姓名')
            return done(false)
          }
          const res = await createStudent(studentForm.value)
          paperStudents.value.push(res.data || res)
          studentForm.value = { name: '', phone: '' }
          Message.success('添加成功')
          done(true)
        } catch (e) {
          Message.error('添加失败')
          done(false)
        }
      })()
    }

    const removeStudentFromPaper = async (studentId) => {
      try {
        await removePaperStudent(editingPaper.value.id, studentId)
        paperStudents.value = paperStudents.value.filter(s => s.id !== studentId)
      } catch (e) {
        Message.error('移除失败')
      }
    }

    const handleExportStudents = async () => {
      try {
        const blob = await exportPaperStudents(editingPaper.value.id)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `考生名单-${editingPaper.value.title}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (e) {
        Message.error('导出失败')
      }
    }

    const handleImportStudents = async (options) => {
      try {
        const file = options.fileItem?.file || options.file
        const res = await importStudents(file)
        if (editingPaper.value?.id) {
          const paperRes = await getPaperStudents(editingPaper.value.id)
          const mapped = paperRes.data.map(ps => ps.student).filter(s => s)
          paperStudents.value = mapped
        }
        Message.success(`成功导入 ${res.data?.count || 0} 名考生`)
      } catch (e) {
        Message.error('导入失败: ' + (e.message || ''))
      }
    }

    const editPaperAction = async (row) => {
      editingPaper.value = row
      paperForm.value = {
        title: row.title || '',
        description: row.description || '',
        time_limit: row.duration || EXAM_CONFIG.DEFAULT_TIME_LIMIT,
        shuffle: row.shuffle || false,
        show_score: row.show_score !== false,
        show_answer: row.show_answer !== false,
        access_code: row.access_code || '',
        ip_limit: row.ip_limit || 0,
        allow_all_users: row.allow_all_users !== false,
        start_time: row.start_time || null,
        end_time: row.end_time || null
      }
      // 加载考生
      if (!row.allow_all_users && row.id) {
        try {
          const res = await getPaperStudents(row.id)
          const mapped = res.data.map(ps => ps.student).filter(s => s)
          paperStudents.value = mapped
        } catch (e) { console.error(e) }
      } else {
        paperStudents.value = []
      }
      showPaperDialog.value = true
    }

    const viewExamUrl = async (id) => {
      try {
        const res = await getPaperExamUrl(id)
        examUrlData.value = res.data || {}
        showExamUrlDialog.value = true
      } catch (e) {
        Message.error('获取考试地址失败')
      }
    }

    const manageQuestions = (id) => {
      window.open(`/paper/${id}/questions`, '_blank')
    }

    const handlePaperCommand = (cmd, row) => {
      switch (cmd) {
        case 'questions': manageQuestions(row.id); break
        case 'url': viewExamUrl(row.id); break
        case 'records': viewExamRecords(row.id); break
        case 'publish': publishPaperAction(row.id); break
        case 'unpublish': unpublishPaperAction(row.id); break
        case 'edit': editPaperAction(row); break
        case 'delete': deletePaperAction(row.id); break
      }
    }

    const copyUrl = async () => {
      try {
        await navigator.clipboard.writeText(examUrlData.value.access_url)
        Message.success('链接已复制')
      } catch {
        const input = document.createElement('input')
        input.value = examUrlData.value.access_url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        Message.success('链接已复制')
      }
    }

    const viewExamRecords = async (id) => {
      try {
        const res = await getExamRecords(id, { page: 1, pageSize: 10 })
        examRecords.value = res.data?.records || res.data?.list || []
        examRecordsStats.value = res.data?.stats || null
        examRecordsPagination.value = res.data?.pagination || null
        examRecordsCurrentPaperId.value = id
        examRecordsPage.value = 1
        showRecordsDialog.value = true
      } catch (e) {
        Message.error('获取考试记录失败')
      }
    }

    const handleExamRecordsPageChange = async (page) => {
      try {
        const res = await getExamRecords(examRecordsCurrentPaperId.value, { page, pageSize: 10 })
        examRecords.value = res.data?.records || res.data?.list || []
        examRecordsPagination.value = res.data?.pagination || null
      } catch (e) { console.error(e) }
    }

    // 组件挂载时自动加载数据
    onMounted(() => {
      loadPapers()
    })

    return {
      papers, papersLoading, papersPage, papersPageSize, paginatedPapers,
      showPaperDialog, showRandomDialog, editingPaper, randomForm, paperForm,
      showStudentDialog, showImportStudentDialog, studentForm, paperStudents,
      showExamUrlDialog, examUrlData, showRecordsDialog, examRecords,
      examRecordsStats, examRecordsPagination, examRecordsPage,
      loadPapers, togglePaperMenu, closeAllPaperMenus,
      publishPaperAction, unpublishPaperAction, deletePaperAction,
      createRandomPaperAction, createNewPaper,
      addStudent, removeStudentFromPaper, handleExportStudents, handleImportStudents,
      editPaperAction, viewExamUrl, manageQuestions, handlePaperCommand,
      copyUrl, viewExamRecords, handleExamRecordsPageChange
    }
  }
}
</script>
