<template>
  <div class="signup-query-page">
    <div class="query-container">
      <div class="query-header">
        <h1>报名查询</h1>
        <p>输入您的手机号查询报名状态</p>
      </div>

      <div class="query-form">
        <a-input
          v-model="phone"
          placeholder="请输入手机号"
          size="large"
          :max-length="11"
        >
          <template #prefix>
            <icon-phone />
          </template>
        </a-input>

        <a-button
          type="primary"
          size="large"
          :loading="loading"
          @click="handleQuery"
          block
        >
          查询报名
        </a-button>
      </div>

      <!-- 查询结果 -->
      <div v-if="result" class="query-result">
        <a-result
          :status="resultStatus"
          :title="resultTitle"
          :subtitle="resultSubtitle"
        >
          <template #extra>
            <a-descriptions :column="1" bordered v-if="result.status !== 'cancelled'">
              <a-descriptions-item label="报名项目">
                {{ promotion?.title }}
              </a-descriptions-item>
              <a-descriptions-item label="姓名">
                {{ result.name }}
              </a-descriptions-item>
              <a-descriptions-item label="手机号">
                {{ result.phone }}
              </a-descriptions-item>
              <a-descriptions-item label="报名班次">
                {{ result.class_name }}
              </a-descriptions-item>
              <a-descriptions-item label="报名时间">
                {{ formatDate(result.created_at) }}
              </a-descriptions-item>
            </a-descriptions>

            <div class="action-buttons">
              <a-button
                v-if="canCancel"
                type="primary"
                status="danger"
                @click="handleCancel"
                :loading="cancelling"
              >
                取消报名
              </a-button>
              <a-button @click="reset">重新查询</a-button>
            </div>
          </template>
        </a-result>
      </div>
    </div>

    <!-- 取消确认弹窗 -->
    <a-modal
      v-model:visible="cancelModalVisible"
      title="确认取消报名"
      @ok="confirmCancel"
      @cancel="cancelModalVisible = false"
    >
      <p>确定要取消报名吗？此操作不可撤销。</p>
      <a-alert type="warning">
        取消后如需重新报名，请重新提交报名信息
      </a-alert>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconPhone } from '@arco-design/web-vue/es/icon'
import { getPromotionPublic, queryPromotionSignup, cancelPromotionSignup } from '@/api'

const route = useRoute()
const phone = ref('')
const loading = ref(false)
const result = ref(null)
const promotion = ref(null)
const cancelling = ref(false)
const cancelModalVisible = ref(false)

const resultStatus = computed(() => {
  if (!result.value) return 'info'
  switch (result.value.status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'rejected': return 'error'
    case 'cancelled': return 'info'
    default: return 'info'
  }
})

const resultTitle = computed(() => {
  if (!result.value) return ''
  return result.value.status_text
})

const resultSubtitle = computed(() => {
  if (!result.value) return ''
  switch (result.value.status) {
    case 'approved': return '您的报名已通过审核，请准时参加培训'
    case 'pending': return '您的报名正在审核中，请耐心等待'
    case 'rejected': return '您的报名未通过审核，如有疑问请联系主办方'
    case 'cancelled': return '您已取消报名'
    default: return ''
  }
})

const canCancel = computed(() => {
  if (!result.value) return false
  return ['pending', 'approved'].includes(result.value.status)
})

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const loadPromotion = async () => {
  const id = route.params.id
  if (!id) return
  try {
    const res = await getPromotionPublic(id)
    if (res.success) {
      promotion.value = res.data
    }
  } catch (error) {
    console.error('加载文案失败:', error)
  }
}

const handleQuery = async () => {
  if (!phone.value || phone.value.length !== 11) {
    Message.warning('请输入正确的手机号')
    return
  }

  loading.value = true
  try {
    const id = route.params.id
    const res = await queryPromotionSignup(id, { phone: phone.value })
    if (res.success) {
      result.value = res.data
    }
  } catch (error) {
    Message.error(error.response?.data?.message || '查询失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  cancelModalVisible.value = true
}

const confirmCancel = async () => {
  if (!result.value) return

  cancelling.value = true
  try {
    const id = route.params.id
    const res = await cancelPromotionSignup(id, result.value.id, {
      phone: phone.value
    })
    if (res.success) {
      Message.success('取消成功')
      cancelModalVisible.value = false
      // 刷新查询结果
      handleQuery()
    }
  } catch (error) {
    Message.error(error.response?.data?.message || '取消失败')
  } finally {
    cancelling.value = false
  }
}

const reset = () => {
  phone.value = ''
  result.value = null
}

// 加载推广信息
loadPromotion()
</script>

<style scoped>
.signup-query-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 40px 20px;
}

.query-container {
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

.query-header {
  text-align: center;
  margin-bottom: 32px;
}

.query-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.query-header p {
  font-size: 14px;
  color: #666;
}

.query-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.query-result {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #eee;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .signup-query-page {
    padding: 0;
    background: #fff;
  }

  .query-container {
    border-radius: 0;
    box-shadow: none;
    padding: 24px 16px;
  }
}
</style>
