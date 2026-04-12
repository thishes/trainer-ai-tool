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

      <SafeHtml :html="promotion.content" class="promotion-content" />

      <!-- 报名状态区域 -->
      <div class="signup-entry-area">
        <a-divider />

        <!-- 报名未开启 -->
        <div v-if="!promotion.enable_signup" class="signup-disabled-info">
          <a-result status="info" title="报名暂未开放">
            <template #subtitle>该活动暂未开启报名功能，敬请期待</template>
          </a-result>
        </div>

        <!-- 报名已截止 -->
        <div v-else-if="promotion.signup_ended" class="signup-ended-info">
          <a-result status="warning" title="报名已截止">
            <template #subtitle>该项目的报名已经结束，感谢您的关注</template>
          </a-result>
        </div>

        <!-- 项目已归档 -->
        <div v-else-if="promotion.status === 'archived'" class="signup-ended-info">
          <a-result status="info" title="项目已结束">
            <template #subtitle>该项目已归档，不再接受报名</template>
          </a-result>
        </div>

        <!-- 可以报名 -->
        <div v-else class="signup-action-area">
          <div class="signup-action-content">
            <div class="signup-icon-wrapper">
              <icon-user-group size="32" />
            </div>
            <div class="signup-text">
              <h3>立即参与报名</h3>
              <p>{{ getSignupHint() }}</p>
            </div>
          </div>
          <a-button
            type="primary"
            size="large"
            class="signup-btn"
            @click="goToSignup"
          >
            立即报名
            <icon-right />
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconUserGroup, IconRight } from '@arco-design/web-vue/es/icon'
import SafeHtml from '@/components/SafeHtml.vue'
import { getPromotionPublic } from '@/api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref(null)
const promotion = ref(null)

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

const getSignupHint = () => {
  const classes = promotion.value?.signup_config?.classes || []
  if (classes.length > 0) {
    return `当前开放 ${classes.length} 个班次可供选择`
  }
  return '填写信息即可完成报名'
}

const goToSignup = () => {
  router.push({
    name: 'PromotionSignup',
    params: { id: route.params.id }
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

onMounted(() => {
  fetchPromotion()
})
</script>

<style scoped>
.promotion-public-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.promotion-container {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.promotion-header {
  text-align: center;
  margin-bottom: 32px;
  padding: 40px 40px 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-bottom: none;
}

.promotion-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  line-height: 1.4;
  letter-spacing: -0.5px;
}

.promotion-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.publish-time {
  font-size: 14px;
  color: #666;
}

.promotion-content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  padding: 40px;
}

.promotion-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

.promotion-content :deep(p) {
  margin-bottom: 18px;
}

.promotion-content :deep(h2),
.promotion-content :deep(h3) {
  margin-top: 28px;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.signup-entry-area {
  background: #fafbfc;
  padding: 40px;
}

.signup-disabled-info,
.signup-ended-info {
  text-align: center;
  padding: 20px 0;
}

.signup-action-area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
  border-radius: 12px;
  border: 2px solid #e8ecf1;
  transition: all 0.3s ease;
}

.signup-action-area:hover {
  border-color: #667eea;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.signup-action-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.signup-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.signup-text h3 {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.signup-text p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.signup-btn {
  min-width: 160px;
  height: 52px;
  font-size: 17px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.signup-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.35);
}

@media (max-width: 768px) {
  .promotion-public-page {
    padding: 0;
    background: #fff;
  }

  .promotion-container {
    border-radius: 0;
    box-shadow: none;
  }

  .promotion-header {
    padding: 32px 24px 20px;
  }

  .promotion-title {
    font-size: 26px;
  }

  .promotion-content {
    padding: 24px 16px;
  }

  .signup-entry-area {
    padding: 24px 16px;
  }

  .signup-action-area {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }

  .signup-action-content {
    flex-direction: column;
  }

  .signup-btn {
    width: 100%;
  }
}
</style>
