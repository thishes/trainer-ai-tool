<template>
  <div class="courses-panel">
    <div class="panel-header">
      <div class="header-left">
        <h2>课程管理</h2>
        <span class="count">{{ total }} 门课程</span>
      </div>
      <div class="header-right">
        <a-input-search v-model:value="searchText" placeholder="搜索课程..." style="width: 220px;" allow-clear @search="loadCourses" @pressEnter="loadCourses" />
        <a-select v-model:value="statusFilter" style="width: 120px; margin-left: 8px;" placeholder="状态筛选" allow-clear @change="loadCourses">
          <a-option value="">全部</a-option>
          <a-option value="draft">草稿</a-option>
          <a-option value="published">已发布</a-option>
        </a-select>
        <a-button type="primary" style="margin-left: 8px;" @click="showCreateModal = true">
          <template #icon><IconPlus /></template>新建课程
        </a-button>
      </div>
    </div>

    <div v-if="loading && courses.length === 0" class="loading-wrapper"><a-spin size="large" /></div>

    <div v-else-if="courses.length === 0" class="empty-state">
      <a-empty description="还没有课程，立即创建第一门课吧">
        <a-button type="primary" @click="showCreateModal = true">创建课程</a-button>
      </a-empty>
    </div>

    <div v-else class="course-grid">
      <div v-for="course in courses" :key="course.id" class="course-card" @click="editCourse(course)">
        <div class="card-cover" :style="coverStyle(course)">
          <div class="card-cover-overlay">
            <a-tag :color="course.status === 'published' ? 'green' : 'gray'" size="small">{{ course.status === 'published' ? '已发布' : '草稿' }}</a-tag>
            <span class="view-count">{{ course.view_count || 0 }} 次浏览</span>
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title">{{ course.title }}</h3>
          <p class="card-desc">{{ course.description || '暂无描述' }}</p>
          <div class="card-meta">
            <span>{{ course.author_name || '未知' }}</span>
            <span>{{ formatTime(course.updated_at) }}</span>
            <a-space :size="4">
              <a-tooltip content="编辑课程">
                <a-button size="small" text @click.stop="editCourse(course)"><IconEdit /></a-button>
              </a-tooltip>
              <a-tooltip :content="course.status === 'published' ? '下架' : '发布'">
                <a-button size="small" text @click.stop="togglePublish(course)">
                  <component :is="course.status === 'published' ? 'IconDownCircle' : 'IconUpCircle'" />
                </a-button>
              </a-tooltip>
              <a-tooltip content="复制链接">
                <a-button size="small" text @click.stop="copyLink(course)"><IconLink /></a-button>
              </a-tooltip>
              <a-popconfirm title="确定删除此课程？删除后不可恢复。" @confirm="deleteCourse(course)">
                <a-tooltip content="删除课程">
                  <a-button size="small" text status="danger" @click.stop><IconDelete /></a-button>
                </a-tooltip>
              </a-popconfirm>
            </a-space>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination-wrap">
      <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="total" show-less-items @change="loadCourses" />
    </div>

    <!-- 创建/编辑弹窗 -->
    <a-modal v-model:visible="showCreateModal" :title="editingCourse ? '编辑课程' : '新建课程'" :width="560" :mask-closable="false" @ok="saveCourse" @cancel="resetForm" ok-text="保存" cancel-text="取消">
      <a-form :model="formData" layout="vertical">
        <a-form-item label="课程标题" required>
          <a-input v-model:value="formData.title" placeholder="请输入课程标题（1-200字）" :max-length="200" show-word-limit />
        </a-form-item>
        <a-form-item label="课程描述">
          <a-textarea v-model:value="formData.description" placeholder="简要描述这门课程的内容..." :max-length="5000" :auto-size="{ minRows: 3, maxRows: 6 }" show-word-limit />
        </a-form-item>
        <a-form-item label="可见性">
          <a-radio-group v-model:value="formData.visibility">
            <a-radio value="public">公开 - 所有人可访问</a-radio>
            <a-radio value="link">链接访问 - 知道链接即可</a-radio>
            <a-radio value="password">密码保护 - 需输入密码</a-radio>
            <a-radio value="private">私有 - 仅指定用户</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="formData.visibility === 'password'" label="访问密码">
          <a-input-password v-model:value="formData.access_password" placeholder="设置4-20位访问密码" :max-length="20" />
        </a-form-item>
        <a-form-item label="封面图URL（可选）">
          <a-input v-model:value="formData.cover_image" placeholder="图片URL或上传后粘贴" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus, IconEdit, IconDelete, IconLink, IconDownCircle, IconUpCircle } from '@arco-design/web-vue/es/icon'
import { getCourses, createCourse, updateCourse, deleteCourse as deleteCourseApi, publishCourse } from '@/api'

const loading = ref(false)
const courses = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(12)
const searchText = ref('')
const statusFilter = ref('')
const showCreateModal = ref(false)
const editingCourse = ref(null)

const formData = reactive({
  title: '',
  description: '',
  cover_image: '',
  visibility: 'public',
  access_password: ''
})

onMounted(() => {
  loadCourses()
})

async function loadCourses() {
  loading.value = true
  try {
    const res = await getCourses({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchText.value || undefined,
      status: statusFilter.value || undefined
    })
    if (res.data?.success) {
      courses.value = res.data.data?.list || res.data.data || []
      total.value = res.data.data?.pagination?.total || res.data.data?.total || 0
    }
  } catch(e) {
    Message.error('加载课程列表失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  formData.title = ''
  formData.description = ''
  formData.cover_image = ''
  formData.visibility = 'public'
  formData.access_password = ''
  editingCourse.value = null
  showCreateModal.value = false
}

function editCourse(course) {
  editingCourse.value = course
  formData.title = course.title || ''
  formData.description = course.description || ''
  formData.cover_image = course.cover_image || ''
  formData.visibility = course.visibility || 'public'
  formData.access_password = ''
  showCreateModal.value = true
}

async function saveCourse() {
  if (!formData.title.trim()) {
    Message.warning('请输入课程标题')
    return
  }
  try {
    if (editingCourse.value) {
      await updateCourse(editingCourse.value.id, formData)
      Message.success('课程更新成功')
    } else {
      await createCourse(formData)
      Message.success('课程创建成功')
    }
    resetForm()
    loadCourses()
  } catch(e) {
    Message.error('保存失败：' + (e.response?.data?.message || e.message))
  }
}

async function togglePublish(course) {
  try {
    await publishCourse(course.id)
    Message.success(course.status === 'published' ? '已下架' : '已发布')
    loadCourses()
  } catch(e) {
    Message.error('操作失败')
  }
}

async function deleteCourse(course) {
  try {
    await deleteCourseApi(course.id)
    Message.success('删除成功')
    if (courses.value.length <= 1 && currentPage.value > 1) currentPage.value--
    loadCourses()
  } catch(e) {
    Message.error('删除失败')
  }
}

function copyLink(course) {
  const url = `${window.location.origin}/course/${course.id}`
  navigator.clipboard.writeText(url).then(() => Message.success('链接已复制')).catch(() => Message.error('复制失败'))
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function coverStyle(course) {
  if (course.cover_image || course.cover_url) {
    return { background: `url(${course.cover_url || course.cover_image}) center/cover no-repeat` }
  }
  return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
}
</script>

<style scoped>
.courses-panel { padding: 16px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-left h2 { margin: 0; font-size: 18px; font-weight: 600; }
.count { color: var(--text-secondary, #86909c); font-size: 13px; }
.header-right { display: flex; align-items: center; }
.loading-wrapper { display: flex; justify-content: center; align-items: center; min-height: 300px; }
.empty-state { min-height: 300px; display: flex; align-items: center; justify-content: center; }
.course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.course-card { border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color-light, #e5e6eb); transition: all 0.2s; cursor: pointer; background: #fff; }
.course-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); }
.card-cover { height: 140px; position: relative; display: flex; align-items: center; justify-content: center; }
.card-cover-overlay { position: absolute; inset: 0; background: linear-gradient(transparent, rgba(0,0,0,0.5)); display: flex; justify-content: space-between; align-items: flex-end; padding: 8px 12px; }
.view-count { color: #fff; font-size: 12px; opacity: 0.9; }
.card-body { padding: 12px; }
.card-title { margin: 0 0 6px; font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-desc { margin: 0 0 10px; font-size: 13px; color: var(--text-secondary, #86909c); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary, #86909c); }
.pagination-wrap { display: flex; justify-content: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color-light, #e5e6eb); }
</style>
