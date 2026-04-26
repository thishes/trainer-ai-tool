<template>
  <div class="courses-panel">
    <!-- 页面头部 -->
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">课程管理</h1>
          <p class="page-desc">创建和管理在线课程，支持章节编辑与权限控制，共 <span class="highlight">{{ total }}</span> 门课程</p>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-button type="primary" @click="showCreateModal = true">
          <template #icon><IconPlus /></template>
          新建课程
        </a-button>
      </div>
      <div class="toolbar-right">
        <a-input-search v-model:value="searchText" placeholder="搜索课程..." style="width: 200px;" allow-clear @search="loadCourses" @pressEnter="loadCourses" />
        <a-select v-model:value="statusFilter" style="width: 100px; margin-left: 8px;" placeholder="状态筛选" allow-clear @change="loadCourses">
          <a-option value="">全部</a-option>
          <a-option value="draft">草稿</a-option>
          <a-option value="published">已发布</a-option>
        </a-select>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && courses.length === 0 && !editingCourseId" class="loading-wrapper">
      <a-spin :size="36" />
    </div>

    <!-- 【T1.1】增强空状态引导 - 首次使用友好提示 -->
    <div v-else-if="courses.length === 0 && !editingCourseId && !hasActiveFilters" class="empty-state-enhanced">
      <div class="empty-illustration">
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="20" width="120" height="90" rx="8" fill="#E8F3FF" stroke="#165DFF" stroke-width="2"/>
          <rect x="55" y="35" width="70" height="8" rx="4" fill="#165DFF" opacity="0.3"/>
          <rect x="55" y="50" width="90" height="6" rx="3" fill="#C9CDD4"/>
          <rect x="55" y="62" width="80" height="6" rx="3" fill="#C9CDD4"/>
          <rect x="55" y="74" width="60" height="6" rx="3" fill="#C9CDD4"/>
          <circle cx="140" cy="95" r="18" fill="#165DFF" opacity="0.1"/>
          <path d="M133 95 L138 100 L147 91" stroke="#165DFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="60" cy="130" r="12" fill="#F7BA1E" opacity="0.2"/>
          <circle cx="100" cy="135" r="8" fill="#00B42A" opacity="0.2"/>
          <circle cx="140" cy="128" r="10" fill="#F53F3F" opacity="0.15"/>
        </svg>
      </div>
      <h3 class="empty-title">开始创建您的第一门课程</h3>
      <p class="empty-desc">将您的专业知识转化为结构化的在线课程，<br/>帮助学员系统性地学习成长</p>
      <div class="empty-actions">
        <a-button type="primary" size="large" @click="showCreateModal = true">
          <template #icon><IconPlus /></template>
          立即创建课程
        </a-button>
      </div>
      <div class="empty-tips">
        <p><IconInfoCircle /> 小贴士：您也可以从模板快速创建</p>
      </div>
    </div>

    <!-- 【T1.2】搜索无结果 - 提供建议和操作 -->
    <div v-else-if="courses.length === 0 && !editingCourseId && hasActiveFilters" class="no-results-state">
      <div class="no-results-icon">
        <IconSearch :size="48" />
      </div>
      <h3 class="no-results-title">未找到匹配的课程</h3>
      <p class="no-results-desc">
        没有找到包含 "<strong>{{ searchText }}</strong>" 的{{ statusFilterText }}课程
      </p>
      <div class="suggestions-list">
        <h4>建议尝试：</h4>
        <ul>
          <li><a @click="clearSearch">清除所有筛选条件</a></li>
          <li>检查关键词拼写是否正确</li>
          <li>尝试使用更简短的关键词</li>
          <li>更换不同的状态筛选器</li>
        </ul>
      </div>
      <a-button type="primary" @click="clearSearch">
        <template #icon><IconRefresh /></template>
        重置并查看全部课程
      </a-button>
    </div>

    <!-- 编辑器模式 -->
    <CourseEditor
      v-if="editingCourseId"
      :course-id="editingCourseId"
      :course="currentEditingCourse"
      @back="backToList"
      @updated="loadCourses"
    />

    <!-- 课程列表模式 - 美化后的卡片网格 -->
    <template v-else>
      <div class="course-grid" @click="onCardClick">
        <div
          v-for="course in courses"
          :key="course.id"
          class="course-card"
          role="button"
          tabindex="0"
          :data-course-id="course.id"
          @mouseenter="hoveredCard = course.id"
          @mouseleave="hoveredCard = null"
        >
          <!-- 卡片封面区域（增强版） -->
          <div class="card-cover" :style="coverStyle(course)">
            <!-- 装饰性渐变叠加层 -->
            <div class="cover-gradient"></div>

            <!-- 封面内容层 -->
            <div class="card-cover-overlay">
              <div class="overlay-left">
                <a-tag :color="getStatusColor(course.status)" size="small" class="status-tag">
                  <template #icon>
                    <component :is="course.status === 'published' ? IconCheckCircleFill : IconPenFill" />
                  </template>
                  {{ course.status === 'published' ? '已发布' : '草稿' }}
                </a-tag>
              </div>
              <div class="overlay-right">
                <span class="view-count">
                  <IconEye />
                  {{ course.view_count || 0 }}
                </span>
              </div>
            </div>

            <!-- 悬浮操作按钮组（动画显示） -->
            <transition name="fade-slide">
              <div v-if="hoveredCard === course.id" class="cover-actions">
                <a-button-group shape="circle">
                  <a-tooltip content="编辑课程" position="bottom">
                    <a-button type="primary" size="small" @click.stop="enterEditor(course)">
                      <IconEdit />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :content="course.status === 'published' ? '下架课程' : '发布课程'" position="bottom">
                    <a-button size="small" @click.stop="togglePublish(course)">
                      <component :is="course.status === 'published' ? IconDownCircle : IconUpCircle" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip content="复制链接" position="bottom">
                    <a-button size="small" @click.stop="copyLink(course)">
                      <IconLink />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip content="删除课程" position="bottom">
                    <a-button size="small" status="danger" @click.stop="deleteCourse(course)">
                      <IconDelete />
                    </a-button>
                  </a-tooltip>
                </a-button-group>
              </div>
            </transition>
          </div>

          <!-- 卡片主体内容（增强版） -->
          <div class="card-body">
            <!-- 标题区 -->
            <h3 class="card-title" :title="course.title">{{ course.title }}</h3>

            <!-- 描述区 -->
            <p class="card-desc">{{ course.description || '暂无描述' }}</p>

            <!-- 统计信息条（新增） -->
            <div class="card-stats">
              <div class="stat-item">
                <IconDriveFile />
                <span>{{ course.chapterCount || 0 }} 章节</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <IconEye />
                <span>{{ formatViewCount(course.view_count) }}</span>
              </div>
            </div>

            <!-- 底部元信息（增强版） -->
            <div class="card-meta">
              <div class="meta-left">
                <div class="author-avatar" :style="{ background: getAvatarColor(course.author_name) }">
                  {{ (course.author_name || '未')[0].toUpperCase() }}
                </div>
                <span class="author-name">{{ course.author_name || '未知作者' }}</span>
              </div>
              <div class="meta-right">
                <span class="update-time">{{ formatRelativeTime(course.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination-wrap">
        <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="total" show-less-items @change="loadCourses" />
      </div>
    </template>

    <!-- 创建课程弹窗 -->
    <a-modal v-model:visible="showCreateModal" title="新建课程" :width="560" :mask-closable="false" @cancel="resetForm" :footer="false">
      <a-form layout="vertical" ref="courseFormRef" :model="courseForm">
        <a-form-item label="课程标题" required>
          <a-input v-model:value="courseForm.title" placeholder="请输入课程标题（1-200字）" :max-length="200" show-word-limit />
        </a-form-item>
        <a-form-item label="课程描述">
          <a-textarea v-model:value="courseForm.description" placeholder="简要描述这门课程的内容..." :max-length="5000" :auto-size="{ minRows: 3, maxRows: 6 }" show-word-limit />
        </a-form-item>
        <a-form-item label="可见性">
          <a-radio-group v-model:value="courseForm.visibility">
            <a-radio value="public">公开 - 所有人可访问</a-radio>
            <a-radio value="link">链接访问 - 知道链接即可</a-radio>
            <a-radio value="password">密码保护 - 需输入密码</a-radio>
            <a-radio value="private">私有 - 仅指定用户</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="courseForm.visibility === 'password'" label="访问密码">
          <a-input-password v-model:value="courseForm.access_password" placeholder="设置4-20位访问密码" :max-length="20" />
        </a-form-item>
        <a-form-item label="封面图">
          <ImageUploader v-model:value="courseForm.cover_image" :aspect-ratio="16/9" hint-size="1200×630" />
        </a-form-item>
      </a-form>
      <div class="modal-footer">
        <a-button @click="resetForm">取消</a-button>
        <a-button type="primary" :loading="saving" @click="saveCourse">保存</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconEdit,
  IconDelete,
  IconLink,
  IconDownCircle,
  IconUpCircle,
  IconPlus,
  IconInfoCircle,
  IconSearch,
  IconRefresh,
  IconEye,
  IconCheckCircleFill,
  IconPenFill,
  IconDriveFile
} from '@arco-design/web-vue/es/icon'
import ImageUploader from '@/components/ImageUploader.vue'
import CourseEditor from '@/views/CourseEditor.vue'
import { getCourses, createCourse, updateCourse, deleteCourse as deleteCourseApi, publishCourse } from '@/api'

const loading = ref(false)
const courses = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(12)
const searchText = ref('')
const statusFilter = ref('')
const showCreateModal = ref(false)
const saving = ref(false)
const editingCourseId = ref(null)
const currentEditingCourse = ref(null)
const courseFormRef = ref(null)

// 【新增】悬浮卡片追踪状态
const hoveredCard = ref(null)

// 【T1.2】计算属性：是否有活跃的筛选条件
const hasActiveFilters = computed(() => {
  return !!(searchText.value.trim() || statusFilter.value)
})

// 【T1.2】状态筛选器文本
const statusFilterText = computed(() => {
  const map = { 'draft': '草稿', 'published': '已发布' }
  return statusFilter.value ? (map[statusFilter.value] || '') : ''
})

// 【新增】获取状态标签颜色
function getStatusColor(status) {
  return status === 'published' ? 'arcoblue' : 'gray'
}

// 【新增】根据作者名生成头像颜色
function getAvatarColor(name) {
  const colors = [
    '#165DFF', '#722ED1', '#F53F3F', '#FF7D00', '#00B42A',
    '#0FC6C2', '#86909C', '#F7BA1E', '#9E379F', '#E02020'
  ]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 【新增】格式化浏览量显示
function formatViewCount(count) {
  if (!count) return '0浏览'
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w浏览'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k浏览'
  return count + '次浏览'
}

// 【新增】格式化相对时间
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return minutes + '分钟前'
  if (hours < 24) return hours + '小时前'
  if (days < 30) return days + '天前'
  return date.toLocaleDateString('zh-CN')
}

const courseForm = reactive({
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
    if (res.success) {
      const d = res.data
      const list = d?.list || d?.records || d?.items || (Array.isArray(d) ? d : null)
      courses.value = Array.isArray(list) ? list : []
      total.value = d?.total || d?.pagination?.total || (Array.isArray(list) ? list.length : 0)
    } else {
      courses.value = []
      total.value = 0
    }
  } catch(e) {
    console.error('[CoursesPanel] loadCourses error:', e)
    Message.error('加载课程列表失败')
    courses.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(courseForm, {
    title: '',
    description: '',
    cover_image: '',
    visibility: 'public',
    access_password: ''
  })
  showCreateModal.value = false
}

function onCardClick(evt) {
  if (editingCourseId.value) return
  const cardEl = evt.target.closest('.course-card')
  if (!cardEl) return
  if (evt.target.closest('.card-meta, .cover-actions, [class*="tooltip"], [class*="popconfirm"]')) return
  const courseId = Number(cardEl.dataset.courseId)
  const course = Array.isArray(courses.value) ? courses.value.find(c => c.id === courseId) : null
  if (course) enterEditor(course)
}

function enterEditor(course) {
  if (!course) return
  editingCourseId.value = course.id
  currentEditingCourse.value = course
}

function backToList() {
  editingCourseId.value = null
  currentEditingCourse.value = null
  loadCourses()
}

async function saveCourse() {
  let title = (courseForm.title || '').trim()
  if (!title) {
    const titleEl = document.querySelector('input[placeholder*="课程标题"]')
    if (titleEl) title = (titleEl.value || '').trim()
  }
  if (!title) {
    Message.warning('请输入课程标题')
    return
  }
  saving.value = true
  try {
    const payload = {
      title,
      description: (courseForm.description || '').trim(),
      cover_image: courseForm.cover_image || '',
      visibility: courseForm.visibility
    }
    if (courseForm.visibility === 'password') {
      payload.access_password = courseForm.access_password
    }
    if (editingCourseId.value) {
      await updateCourse(editingCourseId.value, payload)
      Message.success('课程更新成功')
    } else {
      await createCourse(payload)
      Message.success('课程创建成功')
    }
    resetForm()
    loadCourses()
  } catch(e) {
    Message.error('保存失败：' + (e.response?.data?.message || e.message))
  } finally {
    saving.value = false
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

// 【T1.2】清除搜索条件
function clearSearch() {
  searchText.value = ''
  statusFilter.value = ''
  currentPage.value = 1
  loadCourses()
}

// 【T1.3】增强删除确认 - 显示详细信息
async function deleteCourse(course) {
  Modal.confirm({
    title: '确定要删除此课程吗？',
    content: `<div style="padding: 8px 0;">
      <p style="margin-bottom: 12px; font-weight: 500; font-size: 15px;">课程名称：《${course.title}》</p>
      <div style="background: #f2f3f5; padding: 12px; border-radius: 6px; font-size: 13px; color: #86909c;">
        <p style="margin: 0 0 8px;">⚠️ 删除后无法恢复，将同时删除：</p>
        <ul style="margin: 0; padding-left: 20px; line-height: 2;">
          <li><strong>${course.chapterCount || 0}</strong> 个章节及其内容</li>
          <li><strong>${course.view_count || 0}</strong> 次浏览记录</li>
          <li>所有相关的学习进度数据</li>
        </ul>
      </div>
    </div>`,
    okText: '确认删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await deleteCourseApi(course.id)
        Message.success('课程已删除')
        if (courses.value.length <= 1 && currentPage.value > 1) currentPage.value--
        loadCourses()
      } catch(e) {
        Message.error('删除失败：' + (e.response?.data?.message || e.message))
      }
    }
  })
}

function copyLink(course) {
  const url = `${window.location.origin}/course/${course.id}`
  navigator.clipboard.writeText(url).then(() => Message.success('链接已复制')).catch(() => Message.error('复制失败'))
}

function resolveCoverUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return window.location.origin + url
}

function coverStyle(course) {
  const coverUrl = course.cover_url || course.cover_image
  if (coverUrl) {
    return { background: `url(${resolveCoverUrl(coverUrl)}) center/cover no-repeat` }
  }
  return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
}
</script>

<style scoped>
/* ==================== 基础布局 ==================== */
.courses-panel { padding: 16px; }

.page-header-simple {
  margin-bottom: 16px;
  width: 100%;
}
.page-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.page-header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f3ff;
  color: var(--color-primary, #165dff);
  border-radius: var(--radius-base, 4px);
  flex-shrink: 0;
}
.page-header-icon svg {
  width: 24px;
  height: 24px;
}
.page-title {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #1d2129);
}
.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #86909c);
}
.highlight {
  color: var(--color-primary, #165dff);
  font-weight: 600;
}

.toolbar-standard {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-wrapper { display: flex; justify-content: center; align-items: center; min-height: 300px; }

/* ==================== 空状态样式 ==================== */
.empty-state-enhanced {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}
.empty-illustration {
  width: 200px;
  height: 160px;
  margin-bottom: 24px;
}
.empty-illustration svg {
  width: 100%;
  height: 100%;
}
.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #1d2129);
  margin: 0 0 8px;
}
.empty-desc {
  font-size: 14px;
  color: var(--text-secondary, #86909c);
  margin: 0 0 24px;
  line-height: 1.6;
}
.empty-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.empty-tips {
  font-size: 13px;
  color: var(--text-secondary, #86909c);
}
.empty-tips p {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* ==================== 搜索无结果样式 ==================== */
.no-results-state {
  min-height: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}
.no-results-icon {
  color: #c9cdd4;
  margin-bottom: 16px;
}
.no-results-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1d2129);
  margin: 0 0 8px;
}
.no-results-desc {
  font-size: 14px;
  color: var(--text-secondary, #86909c);
  margin: 0 0 20px;
}
.suggestions-list {
  background: var(--color-bg-soft, #f2f3f5);
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: left;
  max-width: 360px;
}
.suggestions-list h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1d2129);
  margin: 0 0 8px;
}
.suggestions-list ul {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
}
.suggestions-list li {
  font-size: 13px;
  line-height: 2;
  color: var(--text-secondary, #86909c);
}
.suggestions-list a {
  color: var(--color-primary, #165dff);
  cursor: pointer;
  text-decoration: none;
}
.suggestions-list a:hover {
  text-decoration: underline;
}

/* ==================== 美化后的课程卡片网格 ==================== */
.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* 卡片容器 */
.course-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color-light, #e5e6eb);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: #fff;
  position: relative;
}

.course-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
  border-color: transparent;
}

/* 封面区域（增强） */
.card-cover {
  height: 160px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 渐变叠加层 */
.cover-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 40%,
    rgba(0, 0, 0, 0.3) 70%,
    rgba(0, 0, 0, 0.65) 100%
  );
  z-index: 1;
}

/* 封面内容层 */
.card-cover-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 12px 14px;
}

.overlay-left .status-tag {
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.95);
  border: none;
  font-weight: 500;
}

.view-count {
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(8px);
  background: rgba(0, 0, 0, 0.35);
  padding: 4px 10px;
  border-radius: 12px;
}

/* 悬浮操作按钮组 */
.cover-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 动画过渡 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease-out;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translate(-50%, -40%);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -45%);
}

/* 卡片主体（增强） */
.card-body {
  padding: 16px;
}

/* 标题 */
.card-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #1d2129);
  letter-spacing: -0.01em;
}

/* 描述 */
.card-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-secondary, #86909c);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
}

/* 统计信息条（新增） */
.card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-bg-soft, #f7f8fa);
  border-radius: 8px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary, #86909c);
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 14px;
  background: var(--border-color-light, #e5e6eb);
}

/* 底部元信息（增强） */
.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-3, #c9cdd4);
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.author-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary, #86909c);
  font-weight: 500;
}

.update-time {
  white-space: nowrap;
}

/* 分页 */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color-light, #e5e6eb);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
}

/* ==================== 响应式设计 ==================== */
@media screen and (max-width: 767.98px) {
  .course-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .course-card:hover {
    transform: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .card-cover {
    height: 140px;
  }

  .cover-actions {
    position: static;
    transform: none;
    margin-top: 12px;
    justify-content: center;
  }

  .card-body {
    padding: 14px;
  }

  .card-stats {
    flex-wrap: wrap;
    gap: 8px;
  }

  .stat-divider {
    display: none;
  }
}

@media screen and (min-width: 768px) and (max-width: 1024px) {
  .course-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }
}

/* ==================== 深色模式适配 ==================== */
@media (prefers-color-scheme: dark) {
  .course-card {
    background: var(--bg-2, #1d2129);
    border-color: var(--border-color-dark, #2f343d);
  }

  .course-card:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .overlay-left .status-tag {
    background: rgba(30, 33, 41, 0.95);
  }

  .view-count {
    background: rgba(0, 0, 0, 0.5);
  }

  .card-stats {
    background: var(--bg-3, #17191f);
  }

  .card-title {
    color: var(--text-1, #f2f3f5);
  }

  .author-name {
    color: var(--text-2, #c9cdd4);
  }
}
</style>
