<template>
  <div class="promotion-public-page">
    <div class="promotion-container" v-if="loading">
      <a-skeleton active :paragraph="{ rows: 10 }" />
    </div>

    <div class="promotion-container" v-else-if="error">
      <a-result :status="error.code === 'NOT_PUBLISHED' ? '403' : '404'" :title="error.message">
        <template #extra>
          <a-button type="primary" @click="$router.push('/')">返回首页</a-button>
        </template>
      </a-result>
    </div>

    <div class="promotion-container" v-else-if="promotion">
      <div class="promotion-header">
        <h1 class="promotion-title">{{ promotion.title }}</h1>
        <div class="promotion-meta">
          <a-tag :color="getStatusColor(promotion.status)">
            {{ getStatusText(promotion.status) }}
          </a-tag>
          <span class="publish-time">发布时间：{{ formatDate(promotion.created_at) }}</span>
        </div>
      </div>

      <div class="promotion-content" v-html="promotion.content"></div>

      <!-- 报名区域 -->
      <div class="signup-area" v-if="promotion.enable_signup">
        <div v-if="promotion.status === 'published' && !promotion.signup_ended" class="signup-section">
          <a-divider />
          <div class="signup-header">
            <h3>报名信息</h3>
            <p class="signup-desc">请填写以下信息完成报名</p>
          </div>

          <a-form :model="formData" layout="vertical" class="signup-form">
            <a-form-item label="姓名" required>
              <a-input v-model="formData.name" placeholder="请输入您的姓名" size="large" />
            </a-form-item>
            <a-form-item label="单位">
              <a-input v-model="formData.unit" placeholder="请输入您的单位（选填）" size="large" />
            </a-form-item>
            <a-form-item label="手机号码" required>
              <a-input v-model="formData.phone" placeholder="请输入您的手机号码" size="large" />
            </a-form-item>
            <a-form-item label="报名班次" required>
              <a-select v-model="formData.class_id" placeholder="请选择报名班次" size="large">
                <a-option
                  v-for="cls in availableClasses"
                  :key="cls.id"
                  :value="cls.id"
                  :disabled="cls.max_count && cls.current_count >= cls.max_count"
                >
                  {{ cls.name }}
                  <span v-if="cls.max_count" class="class-quota">
                    ({{ cls.current_count || 0 }}/{{ cls.max_count }})
                  </span>
                  <span v-if="cls.max_count && cls.current_count >= cls.max_count" class="class-full">已满</span>
                </a-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-button
                type="primary"
                size="large"
                block
                :loading="submitting"
                @click="handleSubmit"
              >
                立即报名
              </a-button>
            </a-form-item>
          </a-form>
        </div>

        <div v-else-if="promotion.signup_ended" class="signup-ended">
          <a-divider />
          <a-result status="info" title="报名已截止">
            <template #subtitle>该项目的报名已经结束，感谢您的关注</template>
          </a-result>
        </div>

        <div v-else-if="promotion.status === 'archived'" class="signup-ended">
          <a-divider />
          <a-result status="info" title="项目已结束报名">
            <template #subtitle>该项目已归档，不再接受报名</template>
          </a-result>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { getPromotionPublic, createPromotionSignup } from '@/api'

const route = useRoute()
const loading = ref(true)
const error = ref(null)
const promotion = ref(null)
const submitting = ref(false)

const formData = reactive({
  name: '',
  unit: '',
  phone: '',
  class_id: ''
})

const availableClasses = computed(() => {
  return promotion.value?.signup_config?.classes || []
})

const getStatusColor = (status) => {
  const colors = {
    draft: 'gray',
    published: 'green',
    archived: 'orange'
  }
  return colors[status] || 'gray'
}

const getStatusText = (status) => {
  const texts = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档'
  }
  return texts[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const fetchPromotion = async () => {
  const id = route.params.id
  if (!id) {
    error.value = { message: '无效的访问链接' }
    loading.value = false
    return
  }

  try {
    const res = await getPromotionPublic(id)
    if (res.success) {
      promotion.value = res.data
    }
  } catch (err) {
    error.value = {
      message: err.response?.data?.message || '获取文案失败',
      code: err.response?.data?.code
    }
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formData.name || !formData.phone || !formData.class_id) {
    Message.warning('请填写必填项')
    return
  }

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(formData.phone)) {
    Message.warning('请输入正确的手机号码')
    return
  }

  submitting.value = true
  try {
    const res = await createPromotionSignup(promotion.value.id, formData)
    if (res.success) {
      Message.success(res.message)
      // 清空表单
      formData.name = ''
      formData.unit = ''
      formData.phone = ''
      formData.class_id = ''
    }
  } catch (err) {
    Message.error(err.message || '报名失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchPromotion()
})
</script>

<style scoped>
.promotion-public-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 40px 20px;
}

.promotion-container {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

.promotion-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;
}

.promotion-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  line-height: 1.4;
}

.promotion-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.publish-time {
  font-size: 14px;
  color: #999;
}

.promotion-content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
}

.promotion-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.promotion-content :deep(p) {
  margin-bottom: 16px;
}

.signup-area {
  margin-top: 40px;
}

.signup-header {
  text-align: center;
  margin-bottom: 24px;
}

.signup-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.signup-desc {
  font-size: 14px;
  color: #666;
}

.signup-form {
  max-width: 400px;
  margin: 0 auto;
}

.signup-ended {
  margin-top: 40px;
}

.class-quota {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}

.class-full {
  margin-left: 8px;
  color: #f53f3f;
  font-size: 12px;
}

@media (max-width: 768px) {
  .promotion-public-page {
    padding: 0;
    background: #fff;
  }

  .promotion-container {
    border-radius: 0;
    box-shadow: none;
    padding: 24px 16px;
  }

  .promotion-title {
    font-size: 22px;
  }
}
</style>
