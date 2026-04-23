<template>
  <div class="course-editor">
    <div class="editor-header">
      <a-button @click="$emit('back')">
        <template #icon><IconLeft /></template>返回
      </a-button>
      <h3>{{ course?.title || '课程编辑' }}</h3>
      <div class="header-actions">
        <a-tag :color="course?.status === 'published' ? 'green' : 'gray'">{{ course?.status === 'published' ? '已发布' : '草稿' }}</a-tag>
        <!-- 【T1.4】自动保存状态指示器 -->
        <div class="auto-save-indicator" v-if="autoSaveStatus !== 'idle'">
          <IconLoading v-if="autoSaveStatus === 'saving'" :spin="true" />
          <IconCheckCircleFill v-else-if="autoSaveStatus === 'saved'" style="color: #00b42a;" />
          <span class="save-text">{{ autoSaveStatusText }}</span>
        </div>
        <a-button type="primary" :loading="saving" @click="saveCurrentChapter">保存章节</a-button>
        <a-popconfirm v-if="course?.status !== 'published'" title="发布前需至少有一个已发布的章节，确定发布？" @confirm="publishCourseAction">
          <a-button status="success" :loading="publishing">发布课程</a-button>
        </a-popconfirm>
      </div>
    </div>

    <div class="editor-body">
      <!-- 左侧：章节树 -->
      <div class="chapter-sidebar">
        <div class="sidebar-header">
          <span>章节目录</span>
          <a-space :size="4">
            <a-tooltip content="添加顶级章节"><a-button size="small" text @click="addChapter(null)"><IconPlus /></a-button></a-tooltip>
            <a-tooltip content="刷新列表"><a-button size="small" text @click="loadChapters"><IconRefresh /></a-button></a-tooltip>
          </a-space>
        </div>
        <div class="chapter-tree">
          <template v-if="chapters.length > 0">
            <div
              v-for="ch in chapters"
              :key="ch.id"
              class="chapter-node"
              :class="{ active: activeChapterId === ch.id, published: ch.status === 'published' }"
              @click="selectChapter(ch)"
            >
              <div class="node-content">
                <span class="node-title">{{ ch.title || '(未命名)' }}</span>
                <span class="node-status">{{ ch.status === 'published' ? '✓' : '草稿' }}</span>
                <a-dropdown trigger="click" @select="(key) => handleNodeAction(key, ch)">
                  <a-button size="mini" text><IconMoreVertical /></a-button>
                  <template #content>
                    <a-doption value="add">添加子章节</a-doption>
                    <a-doption value="edit">编辑标题</a-doption>
                    <a-doption value="toggle-publish">{{ ch.status === 'published' ? '设为草稿' : '发布' }}</a-doption>
                    <a-doption value="delete" class="danger-item">删除</a-doption>
                  </template>
                </a-dropdown>
              </div>
              <!-- 子节点 -->
              <div v-if="ch.children && ch.children.length" class="children-list">
                <div
                  v-for="child in ch.children"
                  :key="child.id"
                  class="chapter-node child-node"
                  :class="{ active: activeChapterId === child.id, published: child.status === 'published' }"
                  @click.stop="selectChapter(child)"
                >
                  <div class="node-content">
                    <span class="node-title">{{ child.title || '(未命名)' }}</span>
                    <span class="node-status">{{ child.status === 'published' ? '✓' : '草稿' }}</span>
                    <a-dropdown trigger="click" @select="(key) => handleNodeAction(key, child)">
                      <a-button size="mini" text><IconMoreVertical /></a-button>
                      <template #content>
                        <a-doption value="add">添加子章节</a-doption>
                        <a-doption value="edit">编辑标题</a-doption>
                        <a-doption value="toggle-publish">{{ child.status === 'published' ? '设为草稿' : '发布' }}</a-doption>
                        <a-doption value="delete" class="danger-item">删除</a-doption>
                      </template>
                    </a-dropdown>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <a-empty v-else description="暂无章节" style="padding: 20px;">
            <a-button size="small" @click="addChapter(null)">添加第一章</a-button>
          </a-empty>
        </div>
      </div>

      <!-- 右侧：富文本编辑区 -->
      <div class="content-area">
        <div v-if="activeChapterId" class="editor-wrapper">
          <div class="editor-toolbar">
            <a-input v-model:value="activeTitle" placeholder="章节标题" size="large" :max-length="200" show-word-limit />
            <div class="toolbar-right">
              <a-switch v-model:checked="isPublished" checked-text="已发布" unchecked-text="草稿" size="small" />
            </div>
          </div>
          <div ref="editorContainerRef" class="rich-editor"></div>
        </div>
        <div v-else class="no-selection">
          <a-empty description="选择左侧章节开始编辑内容" />
        </div>
      </div>
    </div>

    <!-- 添加/编辑章节弹窗 -->
    <a-modal v-model:visible="showChapterModal" :title="editingChapterId ? '编辑章节' : '新建章节'" :width="440" @ok="confirmChapterModal" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" :model="{ title: newChapterTitle }">
        <a-form-item label="章节标题" required>
          <a-input v-model:value="newChapterTitle" placeholder="请输入章节标题" :max-length="200" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { IconLeft, IconPlus, IconRefresh, IconMoreVertical, IconLoading, IconCheckCircleFill } from '@arco-design/web-vue/es/icon'
import { getCourseChapters, createChapter, updateChapter, deleteChapter as deleteChapterApi, publishCourse } from '@/api'
import E from 'wangeditor'

const props = defineProps({ courseId: { type: [String, Number], required: true }, course: { type: Object, default: null } })
const emit = defineEmits(['back', 'updated'])
const router = useRouter()

const chapters = ref([])
const activeChapterId = ref(null)
const activeTitle = ref('')
const isPublished = ref(false)
const saving = ref(false)
const publishing = ref(false)
const showChapterModal = ref(false)
const editingChapterId = ref(null)
const newChapterParentId = ref(null)
const newChapterTitle = ref('')
let editorInstance = null
const editorContainerRef = ref(null)

// 【T1.4】自动保存相关状态
const autoSaveStatus = ref('idle') // 'idle' | 'saving' | 'saved'
let autoSaveTimer = null
const AUTO_SAVE_DELAY = 5000 // 5秒防抖

// 【T1.4】离开页面确认相关
const hasUnsavedChanges = ref(false)

onMounted(async () => {
  await loadChapters()
})

async function loadChapters() {
  try {
    const res = await getCourseChapters(props.courseId)
    if (res.success) {
      const d = res.data
      chapters.value = d?.chapters || d?.flatList || []
      if (!activeChapterId.value && chapters.value.length > 0) {
        selectChapter(chapters.value[0])
      }
    }
  } catch(e) {
    Message.error('加载章节失败')
  }
}

function selectChapter(ch) {
  if (activeChapterId.value && editorInstance) {
    saveCurrentChapter()
  }
  activeChapterId.value = ch.id
  activeTitle.value = ch.title || ''
  isPublished.value = ch.status === 'published'
  nextTick(() => initEditor())
}

function initEditor() {
  if (!editorContainerRef.value) return
  destroyEditor()
  try {
    const chapter = findChapterById(chapters.value, activeChapterId.value)
    editorInstance = new E(editorContainerRef.value)
    editorInstance.config.uploadImgServer = '/api/upload'
    editorInstance.config.uploadImgFieldName = 'file'
    editorInstance.config.uploadImgMaxSize = 5 * 1024 * 1024
    editorInstance.config.uploadImgMaxLength = 9
    editorInstance.config.uploadImgHeaders = {}
    editorInstance.config.uploadImgHooks = {
      customInsert(resData, insertFn) {
        const url = resData?.data?.url || resData?.url || ''
        if (url) insertFn(url, '', '')
      },
      error() { Message.error('图片上传失败') }
    }
    editorInstance.config.showLinkImg = false
    editorInstance.config.zIndex = 100
    editorInstance.create()
    editorInstance.txt.html(chapter?.content || '')

    // 【T1.4】监听编辑器内容变更，触发自动保存
    editorInstance.onchange = () => {
      hasUnsavedChanges.value = true
      triggerAutoSave()
    }
  } catch(e) {
    console.error('Editor init error:', e)
    if (editorContainerRef.value) {
      const chapter = findChapterById(chapters.value, activeChapterId.value)
      editorContainerRef.value.innerHTML = `<textarea style="width:100%;min-height:400px;padding:12px;border:1px solid var(--border-color);border-radius:6px;font-size:14px;">${(chapter?.content || '')}</textarea>`
    }
  }
}

function findChapterById(list, id) {
  for (const node of list) {
    if (node.id === id) return node
    if (node.children) {
      const found = findChapterById(node.children, id)
      if (found) return found
    }
  }
  return null
}

function destroyEditor() {
  if (editorInstance) {
    try { editorInstance.destroy() } catch(e) {}
    editorInstance = null
  }
}

async function saveCurrentChapter() {
  if (!activeChapterId.value) return
  saving.value = true
  try {
    let content = ''
    if (editorInstance && typeof editorInstance.txt?.html === 'function') {
      content = editorInstance.txt.html()
    } else if (editorContainerRef.value) {
      const ta = editorContainerRef.value.querySelector('textarea')
      content = ta?.value || ''
    }
    await updateChapter(props.courseId, activeChapterId.value, {
      title: activeTitle.value,
      content,
      status: isPublished.value ? 'published' : 'draft'
    })
    Message.success('保存成功')
    hasUnsavedChanges.value = false // 【T1.4】标记为已保存
    loadChapters()
    emit('updated')
  } catch(e) {
    Message.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 【T1.4】自动保存触发函数（带防抖）
function triggerAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveStatus.value = 'saving'
  autoSaveTimer = setTimeout(async () => {
    await performAutoSave()
  }, AUTO_SAVE_DELAY)
}

// 【T1.4】执行自动保存（静默模式）
async function performAutoSave() {
  if (!activeChapterId.value || !editorInstance) return

  try {
    const content = typeof editorInstance.txt?.html === 'function' ? editorInstance.txt.html() : ''
    await updateChapter(props.courseId, activeChapterId.value, {
      title: activeTitle.value,
      content,
      status: isPublished.value ? 'published' : 'draft'
    })
    autoSaveStatus.value = 'saved'
    hasUnsavedChanges.value = false
    setTimeout(() => { autoSaveStatus.value = 'idle' }, 2000) // 2秒后隐藏状态
  } catch(e) {
    console.warn('[AUTO_SAVE] 自动保存失败:', e)
    autoSaveStatus.value = 'idle'
  }
}

// 【T1.4】自动保存状态文本
const autoSaveStatusText = computed(() => {
  switch(autoSaveStatus.value) {
    case 'saving': return '正在保存...'
    case 'saved': return '已自动保存'
    default: return ''
  }
})

// 【T1.4】离开页面前的未保存提示（使用路由守卫）
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    Modal.confirm({
      title: '确定要离开吗？',
      content: '您有未保存的内容，离开后将丢失。建议先点击"保存章节"按钮。',
      okText: '离开',
      cancelText: '继续编辑',
      onOk: () => next(),
      onCancel: () => {}
    })
  } else {
    next()
  }
})

async function publishCourseAction() {
  publishing.value = true
  try {
    await publishCourse(props.courseId)
    Message.success('课程已发布')
    emit('updated')
  } catch(e) {
    Message.error('发布失败：' + (e.response?.data?.message || e.message))
  } finally {
    publishing.value = false
  }
}

function addChapter(parentId) {
  newChapterParentId.value = parentId
  editingChapterId.value = null
  newChapterTitle.value = ''
  showChapterModal.value = true
}

async function confirmChapterModal() {
  let title = newChapterTitle.value?.trim()
  if (!title) {
    const inputEl = document.querySelector('input[placeholder*="章节标题"]')
    if (inputEl) title = (inputEl.value || '').trim()
  }
  if (!title) { Message.warning('请输入章节标题'); return }
  try {
    if (editingChapterId.value) {
      await updateChapter(props.courseId, editingChapterId.value, { title })
      Message.success('章节更新成功')
    } else {
      await createChapter(props.courseId, { title, parent_id: newChapterParentId.value, status: 'draft' })
      Message.success('章节创建成功')
    }
    showChapterModal.value = false
    loadChapters()
  } catch(e) {
    Message.error(editingChapterId.value ? '更新失败' : '创建失败')
  }
}

async function handleNodeAction(action, ch) {
  switch(action) {
    case 'add':
      addChapter(ch.id)
      break
    case 'edit':
      newChapterTitle.value = ch.title
      editingChapterId.value = ch.id
      newChapterParentId.value = null
      showChapterModal.value = true
      break
    case 'toggle-publish':
      try {
        await updateChapter(props.courseId, ch.id, { status: ch.status === 'published' ? 'draft' : 'published' })
        Message.success('状态更新成功')
        loadChapters()
      } catch(e) { Message.error('更新失败') }
      break
    case 'delete':
      // 【T1.3】增强章节删除确认
      Modal.confirm({
        title: '确定要删除此章节吗？',
        content: `章节名称：${ch.title}\n\n删除后该章节的所有内容将无法恢复。`,
        okText: '确认删除',
        okButtonProps: { status: 'danger' },
        onOk: async () => {
          try {
            await deleteChapterApi(props.courseId, ch.id)
            Message.success('章节已删除')
            if (activeChapterId.value === ch.id) {
              activeChapterId.value = null; destroyEditor()
            }
            loadChapters()
          } catch(e) { Message.error('删除失败') }
        }
      })
      break
  }
}

watch(activeTitle, () => {})

onBeforeUnmount(() => {
  destroyEditor()
})
</script>

<style scoped>
.course-editor { display: flex; flex-direction: column; height: calc(100vh - 120px); }
.editor-header { display: flex; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border-color-light, #e5e6eb); margin-bottom: 0; }
.editor-header h3 { margin: 0; font-size: 17px; flex: 1; }
.header-actions { display: flex; align-items: center; gap: 8px; }

/* 【T1.4】自动保存状态指示器样式 */
.auto-save-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-bg-soft, #f2f3f5);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary, #86909c);
  animation: fadeInOut 0.3s ease;
}
.save-text {
  white-space: nowrap;
}
@keyframes fadeInOut {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}
.editor-body { display: flex; flex: 1; overflow: hidden; gap: 0; }
.chapter-sidebar { width: 260px; min-width: 220px; border-right: 1px solid var(--border-color-light, #e5e6eb); display: flex; flex-direction: column; background: #fafbfc; }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border-color-light, #e5e6eb); font-weight: 600; font-size: 13px; }
.chapter-tree { flex: 1; overflow-y: auto; padding: 8px; }
.chapter-node { cursor: pointer; border-radius: 6px; transition: all 0.15s; margin-bottom: 2px; }
.chapter-node:hover { background: rgba(var(--primary-6), 0.06); }
.chapter-node.active { background: rgba(var(--primary-6), 0.1); }
.chapter-node.published .node-title::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00b42a; margin-right: 6px; vertical-align: middle; }
.node-content { display: flex; align-items: center; padding: 7px 10px; gap: 4px; }
.node-title { flex: 1; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-status { font-size: 11px; color: var(--text-secondary, #86909c); opacity: 0.7; }
.children-list { padding-left: 18px; margin-top: 2px; }
.child-node { font-size: 13px; }
.content-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.editor-wrapper { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.editor-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border-color-light, #e5e6eb); }
.editor-toolbar .arco-input-wrapper { flex: 1; }
.toolbar-right { display: flex; align-items: center; gap: 8px; }
.rich-editor { flex: 1; overflow-y: auto; }
.no-selection { flex: 1; display: flex; align-items: center; justify-content: center; }
.danger-item { color: rgb(var(--danger-6)); }
</style>
