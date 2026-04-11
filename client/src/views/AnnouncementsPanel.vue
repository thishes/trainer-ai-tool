<template>
  <div class="page-view">
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">公告管理</h1>
          <p class="page-desc">管理新闻公告，支持富文本和图片上传</p>
        </div>
      </div>
    </div>
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-button type="primary" @click="openAnnouncementDialog()">+ 新建公告</a-button>
      </div>
    </div>
    <a-card class="content-card">
      <template v-if="announcementsLoading">
        <a-skeleton :animation="true">
          <a-skeleton-line :widths="['100%', '80%', '60%', '70%']" :rows="5" />
        </a-skeleton>
      </template>
      <template v-else-if="paginatedAnnouncements.length === 0">
        <a-empty description="暂无公告数据" />
      </template>
      <template v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th width="60">序号</th>
              <th>标题</th>
              <th width="100">类型</th>
              <th width="100">状态</th>
              <th width="160">创建时间</th>
              <th width="150">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, index) in paginatedAnnouncements" :key="a.id">
              <td>{{ (announcementPage - 1) * announcementPageSize + index + 1 }}</td>
              <td class="title-cell">{{ a.title }}</td>
              <td>
                <span v-if="a.importance === 'high'" class="tag tag-red">重要</span>
                <span v-else-if="a.importance === 'medium'" class="tag tag-orange">一般</span>
                <span v-else class="tag tag-blue">普通</span>
              </td>
              <td>
                <span :class="a.status === 'published' ? 'tag tag-green' : 'tag tag-gray'">{{ a.status === 'published' ? '已发布' : '草稿' }}</span>
              </td>
              <td>{{ a.created_at ? new Date(a.created_at).toLocaleString() : '-' }}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                  <a-link @click="openAnnouncementDialog(a)">编辑</a-link>
                  <a-button type="text" status="danger" size="small" @click="deleteAnnouncementAction(a.id)">删除</a-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="announcements.length > announcementPageSize" class="pagination">
          <a-select v-model="announcementPageSize" style="width: 80px" @change="announcementPage = 1">
            <a-option :value="8">8 条</a-option>
            <a-option :value="10">10 条</a-option>
            <a-option :value="15">15 条</a-option>
            <a-option :value="20">20 条</a-option>
          </a-select>
          <span class="page-btn" @click="announcementPage = 1">首页</span>
          <span class="page-btn" @click="announcementPage > 1 && announcementPage--">上一页</span>
          <span class="page-current">{{ announcementPage }} / {{ Math.ceil(announcements.length / announcementPageSize) }}</span>
          <span class="page-btn" @click="announcementPage < Math.ceil(announcements.length / announcementPageSize) && announcementPage++">下一页</span>
          <span class="page-btn" @click="announcementPage = Math.ceil(announcements.length / announcementPageSize)">末页</span>
        </div>
      </template>
    </a-card>

    <!-- 新建/编辑公告弹窗 -->
    <a-modal v-model:visible="showAnnouncementDialog" :title="editingAnnouncement ? '编辑公告' : '新建公告'" :width="800" @cancel="showAnnouncementDialog = false" :footer="null">
      <a-form :model="announcementForm" layout="vertical">
        <a-form-item label="标题">
          <a-input v-model="announcementForm.title" placeholder="请输入公告标题" />
        </a-form-item>
        <a-form-item label="类型">
          <a-select v-model="announcementForm.importance">
            <a-option label="普通" value="normal" />
            <a-option label="一般" value="medium" />
            <a-option label="重要" value="high" />
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="announcementForm.status">
            <a-option label="已发布" value="published" />
            <a-option label="草稿" value="draft" />
          </a-select>
        </a-form-item>
        <a-form-item label="内容">
          <div ref="editorContainerRef" class="rich-editor-wrapper"></div>
        </a-form-item>
      </a-form>
      <div style="text-align: right; margin-top: 16px">
        <a-button @click="showAnnouncementDialog = false">取消</a-button>
        <a-button type="primary" style="margin-left: 8px" @click="saveAnnouncement" :loading="savingAnnouncement">保存</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import E from 'wangeditor'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/api'

export default {
  name: 'AnnouncementsPanel',
  setup() {
    const announcements = ref([])
    const announcementsLoading = ref(false)
    const announcementPage = ref(1)
    const announcementPageSize = ref(8)

    const paginatedAnnouncements = computed(() => {
      const startIndex = (announcementPage.value - 1) * announcementPageSize.value
      return (announcements.value || []).slice(startIndex, startIndex + announcementPageSize.value)
    })

    const showAnnouncementDialog = ref(false)
    const editingAnnouncement = ref(null)
    const announcementForm = ref({ title: '', content: '', importance: 'normal', status: 'published' })
    const savingAnnouncement = ref(false)
    const editorContainerRef = ref(null)
    let editorInstance = null

    const loadAnnouncements = async () => {
      announcementsLoading.value = true
      try {
        const res = await getAnnouncements()
        announcements.value = res.data?.list || res.data || []
      } catch (e) {
        console.error(e)
        Message.error('加载公告失败: ' + (e.message || '网络错误'))
      } finally {
        announcementsLoading.value = false
      }
    }

    const openAnnouncementDialog = (announcement = null) => {
      if (announcement) {
        editingAnnouncement.value = announcement
        announcementForm.value = {
          title: announcement.title,
          content: announcement.content,
          importance: announcement.importance || 'normal',
          status: announcement.status
        }
      } else {
        editingAnnouncement.value = null
        announcementForm.value = { title: '', content: '', type: 'notice', status: 'published' }
      }
      showAnnouncementDialog.value = true
      nextTick(() => {
        if (editorInstance) {
          editorInstance.destroy()
          editorInstance = null
        }
        if (editorContainerRef.value && typeof E !== 'undefined') {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
          let ignoreNextChange = true
          editorInstance = new E(editorContainerRef.value)
          editorInstance.config.uploadImgServer = `${apiBase}/announcements/upload`
          // Token 通过 HttpOnly Cookie 传输，wangEditor 上传使用 withCredentials
          editorInstance.config.uploadImgHeaders = {
            'X-Requested-With': 'XMLHttpRequest'
          }
          editorInstance.config.uploadImgHooks = {
            before: (xhr) => {
              // 确保 Cookie（含 HttpOnly token）随上传请求发送
              if (xhr && xhr.withCredentials !== undefined) {
                xhr.withCredentials = true
              }
              Message.info('图片上传中...')
            },
            success: () => {},
            fail: (xhr) => {
              Message.error('图片上传失败')
              console.error('Upload failed:', xhr)
            },
            error: (xhr) => {
              Message.error('图片上传出错')
              console.error('Upload error:', xhr)
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
          // 确保 Cookie 随上传请求一起发送
          editorInstance.config.customUploadImg = null // 使用默认上传，withCredentials 通过拦截器处理
          editorInstance.create()
          editorInstance.txt.html(announcementForm.value.content || '')
          editorInstance.onchange = () => {
            if (ignoreNextChange) {
              ignoreNextChange = false
              return
            }
            announcementForm.value.content = editorInstance.txt.html()
          }
        }
      })
    }

    const saveAnnouncement = async () => {
      if (!announcementForm.value.title) {
        Message.error('请输入公告标题')
        return
      }
      if (editorInstance) {
        announcementForm.value.content = editorInstance.txt.html()
      }
      savingAnnouncement.value = true
      try {
        if (editingAnnouncement.value) {
          await updateAnnouncement(editingAnnouncement.value.id, announcementForm.value)
          Message.success('更新成功')
        } else {
          await createAnnouncement(announcementForm.value)
          Message.success('创建成功')
        }
        showAnnouncementDialog.value = false
        loadAnnouncements()
      } catch (e) {
        Message.error(e.response?.data?.message || '操作失败')
      } finally {
        savingAnnouncement.value = false
      }
    }

    const deleteAnnouncementAction = (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除该公告吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deleteAnnouncement(id)
            Message.success('删除成功')
            loadAnnouncements()
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    watch(() => showAnnouncementDialog.value, (val) => {
      if (!val && editorInstance) {
        editorInstance.destroy()
        editorInstance = null
      }
    })

    onMounted(() => {
      loadAnnouncements()
    })

    onUnmounted(() => {
      if (editorInstance) {
        editorInstance.destroy()
        editorInstance = null
      }
    })

    return {
      announcements, announcementsLoading, announcementPage, announcementPageSize,
      paginatedAnnouncements, showAnnouncementDialog, editingAnnouncement,
      announcementForm, savingAnnouncement, editorContainerRef,
      loadAnnouncements, openAnnouncementDialog, saveAnnouncement, deleteAnnouncementAction
    }
  }
}
</script>
