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
        <a-input v-model="searchKeyword" placeholder="搜索标题..." style="width: 200px" @clear="searchKeyword = ''" allow-clear>
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
              <th width="180" style="min-width:180px">操作</th>
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
                <div class="action-group">
                  <a-button type="text" size="small" @click="openStats(p)">
                    <template #icon><icon-bar-chart /></template>
                    统计
                  </a-button>
                  <a-button type="text" size="small" @click="openPreview(p)">
                    <template #icon><icon-eye /></template>
                    预览
                  </a-button>
                  <a-dropdown trigger="click" position="bottom">
                    <a-button type="text" size="small">
                      <template #icon><icon-more /></template>
                      更多
                    </a-button>
                    <template #content>
                      <a-doption @click="openSignupList(p)">
                        <template #icon><icon-user-group /></template>
                        名单管理
                      </a-doption>
                      <a-doption @click="openSignupConfig(p)">
                        <template #icon><icon-settings /></template>
                        报名配置
                      </a-doption>
                      <a-doption @click="openEditDialog(p)" :disabled="p.locked && !isAdmin">
                        <template #icon><icon-edit /></template>
                        编辑文案
                      </a-doption>
                      <a-divider style="margin: 4px 0" />
                      <a-doption @click="toggleLock(p)" :disabled="!isAdmin">
                        <template #icon><icon-lock v-if="!p.locked" /><icon-unlock v-else /></template>
                        {{ p.locked ? '解锁文案' : '锁定文案' }}
                      </a-doption>
                      <a-doption status="danger" @click="handleDelete(p.id)" :disabled="p.locked && !isAdmin">
                        <template #icon><icon-delete /></template>
                        删除文案
                      </a-doption>
                    </template>
                  </a-dropdown>
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

    <!-- 使用新的预览弹窗组件 -->
    <PreviewDialog
      v-model:visible="previewDialogVisible"
      :promotion-id="selectedPromotionId"
    />

    <!-- 名单管理弹窗 -->
    <SignupListDialog
      v-model:visible="signupListVisible"
      :promotion="selectedPromotion"
      @refresh="loadPromotions"
    />

    <!-- 报名配置弹窗 -->
    <SignupConfigDialog
      v-model:visible="signupConfigVisible"
      :promotion="selectedPromotion"
      @success="loadPromotions"
    />

    <!-- 数据统计弹窗 -->
    <PromotionStats
      v-model:visible="statsVisible"
      :promotion="selectedPromotion"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import E from 'wangeditor'
import { getPromotions, createPromotion, updatePromotion, deletePromotion, lockPromotion, unlockPromotion } from '@/api'
import PreviewDialog from '@/components/promotion/PreviewDialog.vue'
import SignupListDialog from '@/components/promotion/SignupListDialog.vue'
import SignupConfigDialog from '@/components/promotion/SignupConfigDialog.vue'
import PromotionStats from '@/components/promotion/PromotionStats.vue'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'

const props = defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const loading = ref(false)
const saving = ref(false)
const promotions = ref([])
const { keyword: searchKeyword, debouncedKeyword: debouncedSearchKeyword } = useDebouncedSearch(300)
const currentPage = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const previewDialogVisible = ref(false)
const signupListVisible = ref(false)
const signupConfigVisible = ref(false)
const statsVisible = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const selectedPromotionId = ref(null)
const selectedPromotion = ref(null)

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
  editorInstance.config.uploadImgTimeout = 30000
  editorInstance.config.uploadImgHeaders = {
    'X-Requested-With': 'XMLHttpRequest'
  }
  editorInstance.config.uploadImgHooks = {
    before: (xhr) => {
      Message.info('图片上传中...')
      const csrfMeta = document.querySelector('meta[name="csrf-token"]')
      if (csrfMeta) {
        xhr.setRequestHeader('X-CSRF-Token', csrfMeta.content)
      }
      return xhr
    },
    success: () => {},
    fail: (xhr) => {
      let errorMsg = '图片上传失败'
      try {
        if (xhr && xhr.responseText) {
          const res = JSON.parse(xhr.responseText)
          errorMsg = res.message || errorMsg
        }
      } catch (e) {}
      Message.error(errorMsg)
      console.error('Upload failed:', xhr?.status, xhr?.statusText)
    },
    error: (xhr) => {
      Message.error('图片上传出错: ' + (xhr?.message || '网络错误'))
    },
    customInsert: (insertFn, result) => {
      try {
        const data = typeof result === 'string' ? JSON.parse(result) : result
        if (data.success && data.url) {
          insertFn(data.url)
          Message.success('图片上传成功')
        } else {
          Message.error(data.message || '图片上传失败')
        }
      } catch (e) {
        Message.error('图片上传响应解析失败')
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

watch(() => form.value.enable_signup, (val) => {
  if (val && !form.value.signup_config) {
    form.value.signup_config = { enabled: true, classes: [], fields: [], deadline: null, max_signups: 0 }
  } else if (form.value.signup_config) {
    form.value.signup_config.enabled = val
  }
})

const filteredPromotions = computed(() => {
  if (!debouncedSearchKeyword.value) return promotions.value
  const keyword = debouncedSearchKeyword.value.toLowerCase()
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
  selectedPromotionId.value = item.id
  previewDialogVisible.value = true
}

const openSignupList = (item) => {
  selectedPromotion.value = item
  signupListVisible.value = true
}

const openSignupConfig = (item) => {
  selectedPromotion.value = item
  signupConfigVisible.value = true
}

const openStats = (item) => {
  selectedPromotion.value = item
  statsVisible.value = true
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

  // 同步：如果开启了报名但还没有 signup_config，初始化默认配置
  if (form.value.enable_signup && !form.value.signup_config) {
    form.value.signup_config = { enabled: true, classes: [], fields: [], deadline: null, max_signups: 0 }
  } else if (!form.value.enable_signup && form.value.signup_config) {
    form.value.signup_config.enabled = false
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
      item.locked = false
    } else {
      await lockPromotion(item.id)
      Message.success('锁定成功')
      item.locked = true
    }
    setTimeout(() => loadPromotions(), 500)
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

/* 操作按钮组 */
.action-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-group :deep(.arco-btn-text) {
  padding: 0 4px;
  font-size: 13px;
}

.action-group :deep(.arco-btn-text:hover) {
  background-color: var(--color-fill-2);
}

.action-group :deep(.arco-btn-text .arco-icon) {
  margin-right: 2px;
  font-size: 14px;
}

/* 下拉菜单样式 */
:deep(.arco-dropdown-list) {
  padding: 4px 0;
}

:deep(.arco-dropdown-option) {
  padding: 6px 12px;
  font-size: 13px;
}

:deep(.arco-dropdown-option .arco-icon) {
  margin-right: 6px;
  font-size: 14px;
}

:deep(.arco-dropdown-option-danger) {
  color: var(--color-danger);
}

:deep(.arco-dropdown-option-danger:hover) {
  background-color: var(--color-danger-light-1);
}

:deep(.arco-divider-horizontal) {
  margin: 4px 0;
  min-width: auto;
}
</style>
