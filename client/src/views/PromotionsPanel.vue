<template>
  <div class="page-view">
    <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">海报与报名</h1>
          <p class="page-desc">管理宣传文案及报名信息，共 <span class="highlight">{{ promotions.length }}</span> 条</p>
        </div>
      </div>
    </div>

    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-button type="primary" @click="openCreateDialog">+ 新建文案</a-button>
      </div>
      <div class="toolbar-right">
        <a-input v-model="searchKeyword" placeholder="搜索标题..." style="width: 200px" @input="handleSearch" allow-clear>
          <template #prefix>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </template>
        </a-input>
      </div>
    </div>

    <a-card class="content-card">
      <template v-if="loading">
        <a-skeleton :animation="true">
          <a-skeleton-line :widths="['100%', '80%', '60%', '70%', '50%']" :rows="6" />
        </a-skeleton>
      </template>
      <template v-else-if="filteredPromotions.length === 0">
        <a-empty description="暂无文案数据" />
      </template>
      <template v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th width="60">序号</th>
              <th>标题</th>
              <th width="100">状态</th>
              <th width="100">报名</th>
              <th width="100">锁定</th>
              <th width="140">创建时间</th>
              <th width="180">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, index) in paginatedPromotions" :key="p.id">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="title-cell">{{ p.title }}</td>
              <td>
                <a-tag :color="getStatusColor(p.status)">{{ getStatusText(p.status) }}</a-tag>
              </td>
              <td>
                <a-tag :color="p.enable_signup ? 'green' : 'gray'">{{ p.enable_signup ? '开启' : '关闭' }}</a-tag>
              </td>
              <td>
                <a-tag :color="p.locked ? 'red' : 'green'">{{ p.locked ? '已锁定' : '正常' }}</a-tag>
              </td>
              <td>{{ p.created_at ? new Date(p.created_at).toLocaleString() : '-' }}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                  <a-link @click="openPreview(p)">预览</a-link>
                  <a-link @click="openEditDialog(p)" :disabled="p.locked && !isAdmin">编辑</a-link>
                  <a-button type="text" size="small" @click="toggleLock(p)" :disabled="!isAdmin">
                    {{ p.locked ? '解锁' : '锁定' }}
                  </a-button>
                  <a-button type="text" status="danger" size="small" @click="handleDelete(p.id)" :disabled="p.locked && !isAdmin">删除</a-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredPromotions.length > pageSize" class="pagination">
          <span class="page-current">{{ currentPage }} / {{ totalPages }} 页，共 {{ filteredPromotions.length }} 条</span>
          <span class="page-btn" @click="currentPage = 1">首页</span>
          <span class="page-btn" @click="currentPage > 1 && currentPage--">上一页</span>
          <span class="page-btn" @click="currentPage < totalPages && currentPage++">下一页</span>
          <span class="page-btn" @click="currentPage = totalPages">末页</span>
        </div>
      </template>
    </a-card>

    <a-modal v-model:visible="dialogVisible" :title="isEditing ? '编辑文案' : '新建文案'" @ok="handleSave" @cancel="dialogVisible = false" :width="680" :footer="null">
      <a-form :model="form" layout="vertical">
        <a-form-item label="标题" required>
          <a-input v-model="form.title" placeholder="请输入文案标题" />
        </a-form-item>
        <a-form-item label="内容">
          <div ref="editorContainerRef" class="rich-editor-wrapper"></div>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="form.status">
            <a-option value="draft">草稿</a-option>
            <a-option value="published">已发布</a-option>
            <a-option value="archived">已归档</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="开启报名">
          <a-switch v-model="form.enable_signup" />
        </a-form-item>
        <div style="text-align: right; margin-top: 16px;">
          <a-button @click="dialogVisible = false">取消</a-button>
          <a-button type="primary" @click="handleSave" :loading="saving" style="margin-left: 8px;">保存</a-button>
        </div>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="previewVisible" title="文案预览" :width="600" :footer="null">
      <div class="preview-content">
        <h2>{{ previewData.title }}</h2>
        <div class="preview-meta">
          <a-tag :color="getStatusColor(previewData.status)">{{ getStatusText(previewData.status) }}</a-tag>
          <span v-if="previewData.enable_signup" class="signup-badge">报名开启</span>
        </div>
        <div class="preview-body" v-html="previewData.content"></div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import E from 'wangeditor'
import { getPromotions, createPromotion, updatePromotion, deletePromotion, lockPromotion, unlockPromotion } from '@/api'

const props = defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const loading = ref(false)
const saving = ref(false)
const promotions = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const previewVisible = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const previewData = ref({})

const form = ref({
  title: '',
  content: '',
  status: 'draft',
  enable_signup: false
})

const editorContainerRef = ref(null)
let editorInstance = null
let ignoreNextChange = false

const initEditor = () => {
  if (!editorContainerRef.value) return
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
  editorInstance = new E(editorContainerRef.value)
  editorInstance.config.uploadImgServer = '/api/upload'
  editorInstance.config.uploadImgFileName = 'file'
  editorInstance.config.uploadImgHooks = {
    before: () => { Message.info('图片上传中...') },
    success: () => {},
    fail: (xhr) => {
      Message.error('图片上传失败')
      console.error('Upload failed:', xhr)
    },
    error: () => {
      Message.error('图片上传出错')
    },
    customInsert: (insertFn, result) => {
      if (result.success && result.url) {
        insertFn(result.url)
        Message.success('图片上传成功')
      } else {
        Message.error(result.message || '图片上传失败')
      }
    }
  }
  editorInstance.config.showLinkImg = false
  editorInstance.config.uploadImgMaxSize = 5 * 1024 * 1024
  editorInstance.config.uploadImgMaxLength = 10
  editorInstance.create()
  editorInstance.txt.html(form.value.content || '')
  editorInstance.onchange = () => {
    if (ignoreNextChange) {
      ignoreNextChange = false
      return
    }
    form.value.content = editorInstance.txt.html()
  }
}

const destroyEditor = () => {
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
}

watch(dialogVisible, async (visible) => {
  if (visible) {
    await nextTick()
    initEditor()
  } else {
    destroyEditor()
  }
})

const filteredPromotions = computed(() => {
  if (!searchKeyword.value) return promotions.value
  const keyword = searchKeyword.value.toLowerCase()
  return promotions.value.filter(p => p.title.toLowerCase().includes(keyword))
})

const totalPages = computed(() => Math.ceil(filteredPromotions.value.length / pageSize.value))

const paginatedPromotions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredPromotions.value.slice(start, start + pageSize.value)
})

const getStatusColor = (status) => {
  const colors = { draft: 'gray', published: 'green', archived: 'orange' }
  return colors[status] || 'gray'
}

const getStatusText = (status) => {
  const texts = { draft: '草稿', published: '已发布', archived: '已归档' }
  return texts[status] || status
}

const handleSearch = () => {
  currentPage.value = 1
}

const loadPromotions = async () => {
  loading.value = true
  try {
    const res = await getPromotions()
    promotions.value = res.data?.list || res.data || []
  } catch (e) {
    console.error('加载文案失败:', e)
    Message.error('加载文案失败: ' + (e.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  editingId.value = null
  form.value = { title: '', content: '', status: 'draft', enable_signup: false }
  dialogVisible.value = true
}

const openEditDialog = async (item) => {
  isEditing.value = true
  editingId.value = item.id
  form.value = {
    title: item.title,
    content: item.content || '',
    status: item.status,
    enable_signup: !!item.enable_signup
  }
  dialogVisible.value = true
  // 等待对话框打开后初始化编辑器内容
  await nextTick()
  if (editorInstance) {
    ignoreNextChange = true
    editorInstance.txt.html(form.value.content || '')
  }
}

const openPreview = (item) => {
  previewData.value = item
  previewVisible.value = true
}

const handleSave = async () => {
  if (!form.value.title) {
    Message.warning('请输入标题')
    return
  }
  // 从编辑器获取内容
  if (editorInstance) {
    form.value.content = editorInstance.txt.html()
  }
  saving.value = true
  try {
    if (isEditing.value) {
      await updatePromotion(editingId.value, form.value)
      Message.success('更新成功')
    } else {
      await createPromotion(form.value)
      Message.success('创建成功')
    }
    dialogVisible.value = false
    loadPromotions()
  } catch (e) {
    Message.error('保存失败: ' + (e.message || '操作失败'))
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id) => {
  try {
    await deletePromotion(id)
    Message.success('删除成功')
    loadPromotions()
  } catch (e) {
    Message.error('删除失败: ' + (e.message || '操作失败'))
  }
}

const toggleLock = async (item) => {
  try {
    if (item.locked) {
      await unlockPromotion(item.id)
      Message.success('解锁成功')
    } else {
      await lockPromotion(item.id)
      Message.success('锁定成功')
    }
    loadPromotions()
  } catch (e) {
    Message.error('操作失败: ' + (e.message || '操作失败'))
  }
}

onMounted(() => {
  loadPromotions()
})
</script>

<style scoped>
/* 页面头部样式 */
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
  color: var(--color-primary);
  border-radius: var(--radius-base);
  flex-shrink: 0;
}

.page-header-icon svg {
  width: 24px;
  height: 24px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.page-desc .highlight {
  color: var(--color-primary);
  font-weight: 600;
}

.preview-content h2 {
  margin-bottom: 16px;
  font-size: 18px;
}

.preview-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-1);
}

.signup-badge {
  background: var(--color-primary-light-1);
  color: var(--color-primary-6);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.preview-body {
  line-height: 1.8;
  color: var(--text-2);
}

/* 富文本编辑器样式 */
.rich-editor-wrapper {
  border: 1px solid var(--color-neutral-3);
  border-radius: var(--radius-base);
  min-height: 300px;
  z-index: 100;
}

.rich-editor-wrapper .w-e-toolbar {
  border-bottom: 1px solid var(--color-neutral-3);
}

.rich-editor-wrapper .w-e-text-container {
  min-height: 250px;
}

/* 工具栏样式 */
.toolbar-standard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: nowrap;
  width: 100%;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
