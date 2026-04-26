<template>
  <div class="course-editor">
    <div class="editor-header">
      <a-button @click="$emit('back')">
        <template #icon><IconLeft /></template>返回
      </a-button>
      <h3>{{ course?.title || '课程编辑' }}</h3>
      <div class="header-actions">
        <a-tag :color="course?.status === 'published' ? 'green' : 'gray'">{{ course?.status === 'published' ? '已发布' : '草稿' }}</a-tag>
        <div class="auto-save-indicator" v-if="autoSaveStatus !== 'idle'">
          <IconLoading v-if="autoSaveStatus === 'saving'" :spin="true" />
          <IconCheckCircleFill v-else-if="autoSaveStatus === 'saved'" style="color: #00b42a;" />
          <span class="save-text">{{ autoSaveStatusText }}</span>
        </div>
        <a-tooltip content="编辑课程基础信息">
          <a-button size="small" @click="showCourseInfoModal = true">
            <template #icon><IconPenFill /></template>课程信息
          </a-button>
        </a-tooltip>
        <a-button type="primary" :loading="saving" @click="saveCurrentChapter">保存章节</a-button>
        <a-button v-if="course?.status !== 'published'" status="success" :loading="publishing" @click="showPublishConfirm">发布课程</a-button>
      </div>
    </div>

    <div class="editor-body">
      <div class="chapter-sidebar">
        <div class="sidebar-header">
          <span>章节目录</span>
          <a-space :size="4">
            <a-tooltip content="添加顶级章节"><a-button size="small" text @click="addChapter(null)"><IconPlus /></a-button></a-tooltip>
            <a-tooltip content="刷新列表"><a-button size="small" text @click="loadChapters"><IconRefresh /></a-button></a-tooltip>
          </a-space>
        </div>
        <div class="chapter-tree" @dragover.prevent @drop="handleDropOnRoot">
          <template v-if="chapters.length > 0">
            <div
              v-for="(ch, index) in chapters"
              :key="ch.id"
              class="chapter-node"
              :class="{ active: activeChapterId === ch.id, published: ch.status === 'published', dragging: dragOverId === ch.id }"
              draggable="true"
              @dragstart="handleDragStart($event, ch, index, null)"
              @dragover.prevent="handleDragOver($event, ch)"
              @dragleave="handleDragLeave(ch)"
              @drop.stop="handleDrop($event, ch, index, null)"
              @dragend="handleDragEnd"
              @click="selectChapter(ch)"
            >
              <div class="node-content">
                <span class="drag-handle" @mousedown.stop><IconDragDotVertical /></span>
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
              <div v-if="ch.children && ch.children.length" class="children-list">
                <div
                  v-for="(child, cIndex) in ch.children"
                  :key="child.id"
                  class="chapter-node child-node"
                  :class="{ active: activeChapterId === child.id, published: child.status === 'published', dragging: dragOverId === child.id }"
                  draggable="true"
                  @dragstart="handleDragStart($event, child, cIndex, ch)"
                  @dragover.prevent="handleDragOver($event, child)"
                  @dragleave="handleDragLeave(child)"
                  @drop.stop="handleDrop($event, child, cIndex, ch)"
                  @dragend="handleDragEnd"
                  @click.stop="selectChapter(child)"
                >
                  <div class="node-content">
                    <span class="drag-handle" @mousedown.stop><IconDragDotVertical /></span>
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

      <div class="content-area">
        <div v-if="activeChapterId" class="editor-wrapper" :key="'ed-' + activeChapterId">
          <div class="editor-toolbar">
            <input :value="activeTitle" @input="(e)=>onTitleInput(e.target.value)" placeholder="章节标题" maxlength="200"
              style="flex:1;padding:8px 12px;border:1px solid var(--color-border-2,#e5e6eb);border-radius:4px;font-size:16px;line-height:1.5;outline:none;transition:border-color 0.2s;box-sizing:border-box;"
              @focus="$event.target.style.borderColor='rgb(var(--primary-6))'" @blur="$event.target.style.borderColor='var(--color-border-2,#e5e6eb)'" />
            <div class="toolbar-right">
              <a-switch :checked="isPublished" checked-text="已发布" unchecked-text="草稿" size="small" @change="onPublishToggle" />
            </div>
          </div>
          <div ref="editorContainerRef" class="rich-editor"></div>
        </div>
        <div v-else class="no-selection">
          <a-empty description="选择左侧章节开始编辑内容" />
        </div>
      </div>
    </div>

    <a-modal v-model:visible="showChapterModal" :title="editingChapterId ? '编辑章节' : '新建章节'" :width="440" @ok="confirmChapterModal" ok-text="确定" cancel-text="取消" :mask-closable="false">
      <a-form layout="vertical">
        <a-form-item label="章节标题" required>
          <a-input v-model:value="newChapterTitle" placeholder="请输入章节标题" :max-length="200" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal v-model:visible="showCourseInfoModal" title="编辑课程信息" :width="560" :mask-closable="false" @ok="saveCourseInfo" ok-text="保存" cancel-text="取消" :ok-loading="savingCourseInfo">
      <div v-if="showCourseInfoModal" style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:14px;"><span style="color:rgb(var(--danger-6));margin-right:2px;">*</span>课程标题</label>
          <input :value="courseForm.title" @input="(e)=>courseForm.title=e.target.value" placeholder="请输入课程标题（1-200字）" maxlength="200"
            style="width:100%;padding:8px 12px;border:1px solid var(--color-border-2, #e5e6eb);border-radius:4px;font-size:14px;line-height:1.5715;outline:none;transition:all 0.2s;box-sizing:border-box;"
            @focus="$event.target.style.borderColor='rgb(var(--primary-6))'" @blur="$event.target.style.borderColor='var(--color-border-2, #e5e6eb)'" />
          <div style="text-align:right;font-size:12px;color:var(--text-color-4, #c9cdd4);margin-top:4px;">{{ (courseForm.title||'').length }}/200</div>
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:14px;">课程描述</label>
          <textarea :value="courseForm.description" @input="(e)=>courseForm.description=e.target.value" placeholder="简要描述这门课程的内容..." maxlength="5000"
            style="width:100%;min-height:88px;max-height:176px;padding:8px 12px;border:1px solid var(--color-border-2, #e5e6eb);border-radius:4px;font-size:14px;line-height:1.5715;outline:none;resize:vertical;transition:all 0.2s;box-sizing:border-box;font-family:inherit;"
            @focus="$event.target.style.borderColor='rgb(var(--primary-6))'" @blur="$event.target.style.borderColor='var(--color-border-2, #e5e6eb)'" ></textarea>
          <div style="text-align:right;font-size:12px;color:var(--text-color-4, #c9cdd4);margin-top:4px;">{{ (courseForm.description||'').length }}/5000</div>
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:14px;">可见性</label>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <label v-for="opt in visibilityOptions" :key="opt.value" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0;" @click="courseForm.visibility=opt.value">
              <span :class="['vis-radio', { active: courseForm.visibility === opt.value }]"></span>
              <span style="font-size:14px;">{{ opt.label }}</span>
            </label>
          </div>
        </div>
        <div v-if="courseForm.visibility === 'password'">
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:14px;">访问密码</label>
          <input type="password" :value="courseForm.access_password" @input="(e)=>courseForm.access_password=e.target.value" placeholder="设置4-20位访问密码" maxlength="20"
            style="width:100%;padding:8px 12px;border:1px solid var(--color-border-2, #e5e6eb);border-radius:4px;font-size:14px;outline:none;transition:all 0.2s;box-sizing:border-box;"
            @focus="$event.target.style.borderColor='rgb(var(--primary-6))'" @blur="$event.target.style.borderColor='var(--color-border-2, #e5e6eb)'" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-weight:500;font-size:14px;">封面图</label>
          <ImageUploader v-model:value="courseForm.cover_image" :aspect-ratio="16/9" hint-size="1200×630" />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, onBeforeUnmount, nextTick, h } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconLeft, IconPlus, IconRefresh, IconMoreVertical,
  IconLoading, IconCheckCircleFill, IconPenFill, IconDragDotVertical
} from '@arco-design/web-vue/es/icon'
import ImageUploader from '@/components/ImageUploader.vue'
import {
  getCourseChapters, createChapter, updateChapter,
  deleteChapter as deleteChapterApi, publishCourse,
  updateCourse as updateCourseApi, reorderChapters
} from '@/api'
import E from 'wangeditor'

const props = defineProps({ courseId: { type: [String, Number], required: true }, course: { type: Object, default: null } })
const emit = defineEmits(['back', 'updated'])
const router = useRouter()

const chapters = ref([])
const activeChapterId = ref(null)

// 【修复1】使用 ref + watch 替代 computed（ArcoInput 与 writable computed 存在兼容性问题）
// :key 强制组件重建确保 value 变化时一定重新渲染
const activeTitle = ref('')
const isPublished = ref(false)

// 【核心】activeChapterId 变化时同步标题和发布状态到输入框
watch(activeChapterId, (id) => {
  if (!id) {
    activeTitle.value = ''
    isPublished.value = false
    return
  }
  const ch = findChapterById(chapters.value, id)
  if (ch) {
    activeTitle.value = ch.title || ''
    isPublished.value = ch.status === 'published'
  }
}, { immediate: true })
const saving = ref(false)
const publishing = ref(false)
const showChapterModal = ref(false)
const editingChapterId = ref(null)
const newChapterParentId = ref(null)
const newChapterTitle = ref('')
let editorInstance = null
const editorContainerRef = ref(null)

// 【T1.4】自动保存相关状态
const autoSaveStatus = ref('idle')
let autoSaveTimer = null
const AUTO_SAVE_DELAY = 5000

// 【T1.4】离开页面确认相关
const hasUnsavedChanges = ref(false)

// 【修复1】课程基础信息编辑
const showCourseInfoModal = ref(false)
const savingCourseInfo = ref(false)
const formKey = ref(0)
const visibilityOptions = [
  { value: 'public', label: '公开 - 所有人可访问' },
  { value: 'link', label: '链接访问 - 知道链接即可' },
  { value: 'password', label: '密码保护 - 需输入密码' },
  { value: 'private', label: '私有 - 仅指定用户' }
]
const courseForm = reactive({
  title: '',
  description: '',
  visibility: 'public',
  access_password: '',
  cover_image: ''
})

// 【修复1】props.course 变化时同步到 courseForm（确保弹窗打开时数据已就绪）
function populateCourseForm(source) {
  if (!source) { console.warn('[COURSE_FORM] source is null/undefined'); return false }
  const raw = source && typeof source === 'object' ? (source.__v_raw || source) : source
  const keys = Object.keys(raw)
  console.log('[COURSE_FORM] Raw source keys:', keys, 'full:', JSON.stringify(raw).substring(0, 300))
  if (keys.length === 0) { console.warn('[COURSE_FORM] empty object'); return false }
  courseForm.title = raw.title || ''
  courseForm.description = raw.description || ''
  courseForm.visibility = raw.visibility || 'public'
  courseForm.access_password = raw.access_password || ''
  courseForm.cover_image = raw.cover_image || raw.cover_url || ''
  console.log('[COURSE_FORM] Populated:', { title: courseForm.title, visibility: courseForm.visibility })
  return true
}

watch(() => props.course, (val) => {
  console.log('[COURSE_FORM] props.course changed:', val ? `id=${val.id}, title="${val.title}"` : 'null')
  if (val) populateCourseForm(val)
}, { immediate: true })

// 【修复4】已发布章节数量统计
const publishedChapterCount = computed(() => countPublishedChapters(chapters.value))

// 【修复2】拖拽排序相关状态
const dragNode = ref(null)
const dragOverId = ref(null)

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
  // watch(activeChapterId) 会自动同步 activeTitle/isPublished，但这里也显式设置确保即时性
  activeTitle.value = ch.title || ''
  isPublished.value = ch.status === 'published'
  nextTick(() => initEditor())
}

// 【安全网】activeChapterId 变化时，computed 会自动刷新 activeTitle/isPublished
// 无需额外 watch

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
    hasUnsavedChanges.value = false
    syncTitleToTree(activeChapterId.value, activeTitle.value, isPublished.value ? 'published' : 'draft')
    loadChapters()
    emit('updated')
  } catch(e) {
    Message.error('保存失败：' + (e.response?.data?.message || e.message))
  } finally {
    saving.value = false
  }
}

// 【核心联动】标题输入时：实时同步到左侧章节树
let titleSyncTimer = null
function onTitleInput(val) {
  if (!activeChapterId.value) return
  activeTitle.value = val
  syncTitleToTree(activeChapterId.value, val)
  hasUnsavedChanges.value = true
  if (titleSyncTimer) clearTimeout(titleSyncTimer)
  titleSyncTimer = setTimeout(() => triggerAutoSave(), 1500)
}

function onTitleChange(val) {
  if (!activeChapterId.value) return
  activeTitle.value = val
  syncTitleToTree(activeChapterId.value, val)
  hasUnsavedChanges.value = true
  triggerAutoSave()
}

// 【核心联动】发布开关切换：同步到左侧章节树
function onPublishToggle(checked) {
  if (!activeChapterId.value) return
  isPublished.value = checked
  syncTitleToTree(activeChapterId.value, undefined, checked ? 'published' : 'draft')
  hasUnsavedChanges.value = true
  triggerAutoSave()
}

// 【修复3】同步标题和状态到章节树数据
function syncTitleToTree(chapterId, title, status) {
  function updateNode(list) {
    for (const node of list) {
      if (node.id === chapterId) {
        if (title !== undefined) node.title = title
        if (status !== undefined) node.status = status
        return true
      }
      if (node.children && updateNode(node.children)) return true
    }
    return false
  }
  updateNode(chapters.value)
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
    setTimeout(() => { autoSaveStatus.value = 'idle' }, 2000)
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

// 【T1.4】离开页面前的未保存提示
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

// 【修复3】发布课程确认（使用 Modal.confirm 替代 popconfirm，确保提示内容正确显示）
function showPublishConfirm() {
  const pubCount = countPublishedChapters(chapters.value)
  Modal.confirm({
    title: '确认发布课程？',
    content: () => h('div', { style: 'padding: 8px 0' }, [
      h('div', { style: 'color: var(--color-text-3); font-size: 13px; margin-bottom: 8px;' },
        '发布后学员即可访问课程内容。请确保至少有一个章节已设为「已发布」状态。'
      ),
      pubCount === 0
        ? h('div', { style: 'color: rgb(var(--danger-6)); font-size: 13px;' }, '⚠️ 当前没有已发布的章节，发布可能失败')
        : h('div', { style: 'color: rgb(var(--success-6)); font-size: 13px;' }, `✓ 已有 ${pubCount} 个已发布章节`)
    ]),
    okText: '确认发布',
    cancelText: '取消',
    onOk: () => doPublishCourse(pubCount)
  })
}

async function doPublishCourse(pubCount) {
  publishing.value = true
  try {
    if (pubCount === 0) {
      Message.warning('请先将至少一个章节设为"已发布"状态')
      publishing.value = false
      return
    }
    await publishCourse(props.courseId)
    Message.success(`课程已发布（共 ${pubCount} 个已发布章节）`)
    emit('updated')
  } catch(e) {
    const errMsg = e.response?.data?.message || e.message || '未知错误'
    Message.error('发布失败：' + errMsg)
    console.error('[PUBLISH_ERROR]', e.response?.data || e)
  } finally {
    publishing.value = false
  }
}

// 【修复4辅助】递归统计已发布章节数量
function countPublishedChapters(list) {
  let count = 0
  for (const node of list) {
    if (node.status === 'published') count++
    if (node.children) count += countPublishedChapters(node.children)
  }
  return count
}

// 【修复1】打开课程信息弹窗前填充表单（双重保障：immediate watch + 此处兜底）
watch(showCourseInfoModal, async (val) => {
  if (val) {
    await nextTick()
    populateCourseForm(props.course)
    await nextTick()
    formKey.value++
    await nextTick()
    formKey.value++
  }
})

// 【修复1+2】保存课程基础信息（封面同步更新到卡片和用户端）
async function saveCourseInfo() {
  if (!courseForm.title?.trim()) {
    Message.warning('请输入课程标题')
    return
  }
  savingCourseInfo.value = true
  try {
    const payload = {
      title: courseForm.title.trim(),
      description: courseForm.description || '',
      visibility: courseForm.visibility,
      cover_image: courseForm.cover_image || null
    }
    if (courseForm.visibility === 'password' && courseForm.access_password) {
      payload.access_password = courseForm.access_password
    }
    const res = await updateCourseApi(props.courseId, payload)
    Message.success('课程信息已更新，封面已同步')
    showCourseInfoModal.value = false
    emit('updated', res.data)
  } catch(e) {
    Message.error('更新失败：' + (e.response?.data?.message || e.message))
  } finally {
    savingCourseInfo.value = false
  }
}

function addChapter(parentId) {
  newChapterParentId.value = parentId
  editingChapterId.value = null
  newChapterTitle.value = ''
  showChapterModal.value = true
}

async function confirmChapterModal() {
  let title = (newChapterTitle.value || '').trim()
  if (!title) {
    const inputEl = document.querySelector('.arco-modal-wrapper input[placeholder*="章节标题"]')
    if (inputEl) title = (inputEl.value || '').trim()
  }
  if (!title) { Message.warning('请输入章节标题'); return }
  newChapterTitle.value = ''
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
        const newStatus = ch.status === 'published' ? 'draft' : 'published'
        await updateChapter(props.courseId, ch.id, { status: newStatus })
        Message.success(newStatus === 'published' ? '章节已发布' : '已设为草稿')
        syncTitleToTree(ch.id, undefined, newStatus)
        loadChapters()
      } catch(e) { Message.error('更新失败') }
      break
    case 'delete':
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

// ==================== 【修复2】拖拽排序功能 ====================

function handleDragStart(e, ch, index, parent) {
  dragNode.value = { node: ch, index, parent }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(ch.id))
  setTimeout(() => { e.target.closest('.chapter-node')?.classList.add('dragging-source') }, 0)
}

function handleDragOver(e, targetCh) {
  if (!dragNode.value || dragNode.value.node.id === targetCh.id) return
  dragOverId.value = targetCh.id
}

function handleDragLeave(targetCh) {
  if (dragOverId.value === targetCh.id) {
    dragOverId.value = null
  }
}

function handleDragEnd(e) {
  dragNode.value = null
  dragOverId.value = null
  document.querySelectorAll('.dragging-source').forEach(el => el.classList.remove('dragging-source'))
}

function handleDropOnRoot(e) {
  if (!dragNode.value) return
  moveChapterToPosition(dragNode.value, null, chapters.value.length)
  handleDragEnd(e)
}

function handleDrop(e, targetCh, targetIndex, targetParent) {
  if (!dragNode.value || dragNode.value.node.id === targetCh.id) return
  const targetList = targetParent ? targetParent.children : chapters.value
  moveChapterToPosition(dragNode.value, targetCh, targetIndex, targetParent)
  handleDragEnd(e)
}

async function moveChapterToPosition(source, targetCh, targetIndex, targetParent) {
  const sourceParent = source.parent
  const sourceList = sourceParent ? sourceParent.children : chapters.value
  const sourceIdx = sourceList.findIndex(n => n.id === source.node.id)
  if (sourceIdx < 0) return

  sourceList.splice(sourceIdx, 1)

  const targetList = targetParent ? targetParent.children : chapters.value
  const insertIdx = targetCh ? targetList.findIndex(n => n.id === targetCh.id) : targetList.length
  if (insertIdx >= 0) {
    targetList.splice(insertIdx, 0, source.node)
  } else {
    targetList.push(source.node)
  }

  source.node.parent_id = targetParent ? targetParent.id : null

  try {
    const orders = buildFlatOrders(chapters.value)
    await reorderChapters(props.courseId, orders)
  } catch(e) {
    console.warn('[REORDER] 排序保存失败，正在回滚...', e)
    await loadChapters()
  }
}

function buildFlatOrders(list, result = [], parent = null) {
  list.forEach((node, idx) => {
    result.push({ id: node.id, sort_order: idx, parent_id: parent })
    if (node.children?.length) {
      buildFlatOrders(node.children, result, node.id)
    }
  })
  return result
}

onBeforeUnmount(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  if (titleSyncTimer) clearTimeout(titleSyncTimer)
  destroyEditor()
})
</script>

<style scoped>
.course-editor { display: flex; flex-direction: column; height: calc(100vh - 120px); }
.vis-radio { display: inline-flex; width: 16px; height: 16px; border: 2px solid var(--color-border-3, #d0d0d0); border-radius: 50%; position: relative; flex-shrink: 0; transition: all 0.2s; }
.vis-radio.active { border-color: rgb(var(--primary-6)); background: rgb(var(--primary-6)); }
.vis-radio.active::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; border-radius: 50%; background: #fff; }
.editor-header { display: flex; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border-color-light, #e5e6eb); margin-bottom: 0; }
.editor-header h3 { margin: 0; font-size: 17px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

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
.save-text { white-space: nowrap; }
@keyframes fadeInOut {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}

.editor-body { display: flex; flex: 1; overflow: hidden; gap: 0; }
.chapter-sidebar { width: 280px; min-width: 240px; border-right: 1px solid var(--border-color-light, #e5e6eb); display: flex; flex-direction: column; background: #fafbfc; }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border-color-light, #e5e6eb); font-weight: 600; font-size: 13px; }
.chapter-tree { flex: 1; overflow-y: auto; padding: 8px; }

.chapter-node {
  cursor: grab;
  border-radius: 6px;
  transition: all 0.15s;
  margin-bottom: 2px;
  position: relative;
}
.chapter-node:hover { background: rgba(var(--primary-6), 0.06); }
.chapter-node.active { background: rgba(var(--primary-6), 0.1); }
.chapter-node.published .node-title::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00b42a; margin-right: 6px; vertical-align: middle; }

/* 【修复2】拖拽视觉反馈 */
.chapter-node.dragging { outline: 2px dashed rgb(var(--primary-6)); outline-offset: -2px; background: rgba(var(--primary-6), 0.08); }
.chapter-node.dragging-source { opacity: 0.4; cursor: grabbing; }
.node-content { display: flex; align-items: center; padding: 7px 10px; gap: 4px; }
.node-title { flex: 1; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-status { font-size: 11px; color: var(--text-secondary, #86909c); opacity: 0.7; flex-shrink: 0; }

/* 拖拽手柄 */
.drag-handle {
  cursor: grab;
  color: var(--text-4, #c9cdd4);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s;
  padding: 0 2px;
}
.chapter-node:hover .drag-handle { opacity: 0.6; }
.drag-handle:hover { opacity: 1 !important; color: var(--color-primary); }

.children-list { padding-left: 18px; margin-top: 2px; }
.child-node { font-size: 13px; }

.content-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.editor-wrapper { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.editor-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border-color-light, #e5e6eb); flex-shrink: 0; }
.editor-toolbar .arco-input-wrapper { flex: 1; min-width: 0; }
.toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.rich-editor { flex: 1; overflow-y: auto; }
.no-selection { flex: 1; display: flex; align-items: center; justify-content: center; }
.danger-item { color: rgb(var(--danger-6)); }
</style>
