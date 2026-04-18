<template>
  <div class="course-editor">
    <div class="editor-header">
      <a-button @click="$emit('back')">
        <template #icon><IconLeft /></template>返回
      </a-button>
      <h3>{{ course?.title || '课程编辑' }}</h3>
      <div class="header-actions">
        <a-tag :color="course?.status === 'published' ? 'green' : 'gray'">{{ course?.status === 'published' ? '已发布' : '草稿' }}</a-tag>
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
      <a-form layout="vertical">
        <a-form-item label="章节标题" required>
          <a-input v-model:value="newChapterTitle" placeholder="请输入章节标题" :max-length="200" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconLeft, IconPlus, IconRefresh, IconMoreVertical } from '@arco-design/web-vue/es/icon'
import { getCourseChapters, createChapter, updateChapter, deleteChapter as deleteChapterApi, publishCourse } from '@/api'

const props = defineProps({ courseId: { type: [String, Number], required: true }, course: { type: Object, default: null } })
const emit = defineEmits(['back', 'updated'])

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

onMounted(async () => {
  await loadChapters()
  await importWangEditor()
})

async function importWangEditor() {
  if (typeof window.wangEditor !== 'undefined') return
  try {
    const { createEditor, createToolbar } = await import('@wangeditor/editor-for-vue')
    window._wangeCreateEditor = createEditor
    window._wangeCreateToolbar = createToolbar
  } catch(e) {
    console.warn('wangEditor not available')
  }
}

async function loadChapters() {
  try {
    const res = await getCourseChapters(props.courseId)
    if (res.data?.success) {
      chapters.value = res.data.data?.chapters || res.data.data?.flatList || []
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

async function initEditor() {
  if (!editorContainerRef.value) return
  destroyEditor()
  try {
    const chapter = chapters.value.flatMap(flatten).find(c => c.id === activeChapterId.value)
    const createEditor = window._wangeCreateEditor
    if (!createEditor) {
      editorContainerRef.value.innerHTML = `<textarea style="width:100%;min-height:400px;padding:12px;border:1px solid var(--border-color);border-radius:6px;">${(chapter?.content || '')}</textarea>`
      return
    }
    editorInstance = createEditor({
      selector: editorContainerRef.value,
      html: chapter?.content || '',
      config: {
        placeholder: '开始编写章节内容...',
        MENU_CONF: {
          uploadImage: {
            server: '/api/upload',
            fieldName: 'file',
            maxFileSize: 5 * 1024 * 1024,
            allowedFileTypes: ['image/*']
          }
        },
        onChange(editor) {}
      }
    })
  } catch(e) {
    console.error('Editor init error:', e)
  }
}

function flatten(node) {
  const result = [node]
  if (node.children) node.children.forEach(c => result.push(...flatten(c)))
  return result
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
    if (editorInstance && typeof editorInstance.getHtml === 'function') {
      content = editorInstance.getHtml()
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
    loadChapters()
    emit('updated')
  } catch(e) {
    Message.error('保存失败')
  } finally {
    saving.value = false
  }
}

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
  newChapterParentId = parentId
  editingChapterId.value = null
  newChapterTitle.value = ''
  showChapterModal.value = true
}

async function confirmChapterModal() {
  if (!newChapterTitle.value.trim()) { Message.warning('请输入章节标题'); return }
  try {
    await createChapter(props.courseId, { title: newChapterTitle.value, parent_id: newChapterParentId, status: 'draft' })
    Message.success('章节创建成功')
    showChapterModal.value = false
    loadChapters()
  } catch(e) {
    Message.error('创建失败')
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
      try {
        await deleteChapterApi(props.courseId, ch.id)
        Message.success('删除成功')
        if (activeChapterId.value === ch.id) {
          activeChapterId.value = null; destroyEditor()
        }
        loadChapters()
      } catch(e) { Message.error('删除失败') }
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
