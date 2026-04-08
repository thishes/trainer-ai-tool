<template>
  <div class="page-view">
    <div class="page-header-content">
      <div class="page-header-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <div class="page-header-text">
        <h1 class="page-title">{{ isEdit ? '编辑文案' : '新建文案' }}</h1>
        <p class="page-desc">{{ isEdit ? '修改宣传文案内容' : '创建新的宣传文案' }}</p>
      </div>
    </div>

    <a-card class="content-card">
      <a-spin :loading="loading">
        <a-form :model="form" layout="vertical" @submit="handleSave">
          <a-form-item label="标题" field="title" required :rules="[{ required: true, message: '请输入文案标题' }]">
            <a-input v-model="form.title" placeholder="请输入文案标题" :max-length="100" show-word-limit />
          </a-form-item>

          <a-form-item label="状态" field="status">
            <a-select v-model="form.status">
              <a-option label="草稿" value="draft" />
              <a-option label="已发布" value="published" />
            </a-select>
          </a-form-item>

          <a-form-item label="内容" field="content">
            <div ref="editorContainerRef" class="rich-editor-wrapper"></div>
          </a-form-item>

          <a-form-item label="报名开关" field="enable_signup">
            <a-switch v-model="form.enable_signup" />
          </a-form-item>

          <a-form-item v-if="user?.role === 'admin'" label="锁定设置" field="locked">
            <a-switch v-model="form.locked" />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" :loading="saving" :disabled="saving">
                保存
              </a-button>
              <a-button @click="handlePreview" :disabled="saving">
                预览
              </a-button>
              <a-button @click="handleBack">
                返回
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-spin>
    </a-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import E from 'wangeditor'
import { getPromotion, createPromotion, updatePromotion } from '@/api'

export default {
  name: 'PromotionEdit',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))

    const isEdit = ref(false)
    const loading = ref(false)
    const saving = ref(false)
    const promotionId = ref(null)
    const editorContainerRef = ref(null)
    let editorInstance = null

    const form = reactive({
      title: '',
      content: '',
      status: 'draft',
      enable_signup: false,
      locked: false
    })

    let ignoreNextChange = false

    const initEditor = () => {
      if (!editorContainerRef.value) return
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
      editorInstance.txt.html(form.content || '')
      editorInstance.onchange = () => {
        if (ignoreNextChange) {
          ignoreNextChange = false
          return
        }
        form.content = editorInstance.txt.html()
      }
    }

    const loadPromotion = async (id) => {
      loading.value = true
      try {
        const res = await getPromotion(id)
        const data = res.data || res
        form.title = data.title || ''
        form.content = data.content || ''
        form.status = data.status || 'draft'
        form.enable_signup = data.enable_signup || false
        form.locked = data.locked || false
        promotionId.value = id
        isEdit.value = true
        await nextTick()
        if (editorInstance) {
          ignoreNextChange = true
          editorInstance.txt.html(form.content || '')
        }
      } catch (e) {
        Message.error('加载文案失败')
        console.error(e)
      } finally {
        loading.value = false
      }
    }

    const handleSave = async () => {
      if (!form.title) {
        Message.error('请输入文案标题')
        return
      }
      if (editorInstance) {
        form.content = editorInstance.txt.html()
      }
      saving.value = true
      try {
        const data = {
          title: form.title,
          content: form.content,
          status: form.status,
          enable_signup: form.enable_signup,
          locked: form.locked
        }
        if (isEdit.value && promotionId.value) {
          await updatePromotion(promotionId.value, data)
          Message.success('更新成功')
        } else {
          await createPromotion(data)
          Message.success('创建成功')
        }
        router.push('/promotions')
      } catch (e) {
        Message.error(isEdit.value ? '更新失败' : '创建失败')
        console.error(e)
      } finally {
        saving.value = false
      }
    }

    const handlePreview = () => {
      if (!form.title) {
        Message.error('请先输入标题')
        return
      }
      Message.info('预览功能开发中')
    }

    const handleBack = () => {
      router.push('/promotions')
    }

    const handleKeydown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault()
          handleSave()
        } else if (e.key === 'p') {
          e.preventDefault()
          handlePreview()
        }
      }
    }

    onMounted(async () => {
      const id = route.params.id
      if (id) {
        await loadPromotion(id)
      }
      await nextTick()
      initEditor()
      window.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      if (editorInstance) {
        editorInstance.destroy()
        editorInstance = null
      }
      window.removeEventListener('keydown', handleKeydown)
    })

    return {
      user,
      form,
      isEdit,
      loading,
      saving,
      editorContainerRef,
      handleSave,
      handlePreview,
      handleBack
    }
  }
}
</script>

<style scoped>
.page-view {
  padding: 24px;
}

.page-header-content {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.page-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #165dff 0%, #4080ff 100%);
  border-radius: 12px;
  color: #fff;
  margin-right: 16px;
}

.page-header-text .page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color, #1a1a1a);
  margin: 0 0 4px 0;
}

.page-header-text .page-desc {
  font-size: 14px;
  color: var(--text-color-3, #6b6b6b);
  margin: 0;
}

.content-card {
  border-radius: 8px;
}

.rich-editor-wrapper {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  min-height: 400px;
}
</style>
