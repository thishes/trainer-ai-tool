<template>
  <div class="promotion-signup-page">
    <div class="signup-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <a-skeleton active :paragraph="{ rows: 8 }" />
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <a-result :status="'404'" :title="error.message">
          <template #extra>
            <a-button type="primary" @click="$router.push('/')">返回首页</a-button>
          </template>
        </a-result>
      </div>

      <!-- 报名成功 -->
      <div v-else-if="signupSuccess" class="success-state">
        <a-result
          status="success"
          :title="autoReply?.title || '报名成功！'"
          :subtitle="autoReply?.content || '我们会通过手机号与您联系，请保持电话畅通'"
        >
          <template #extra>
            <a-space direction="vertical" :size="16">
              <a-button type="primary" size="large" @click="goBackToPromotion">
                返回宣传页
              </a-button>
              <a-button size="large" @click="resetForm">
                继续报名
              </a-button>
            </a-space>
          </template>
        </a-result>

        <!-- 成功动画装饰 -->
        <div class="success-decoration">
          <div class="success-circle"></div>
          <div class="success-circle delay-1"></div>
          <div class="success-circle delay-2"></div>
        </div>
      </div>

      <!-- 报名失败 -->
      <div v-else-if="signupError" class="error-state">
        <a-result
          status="error"
          title="报名失败"
          :subtitle="signupErrorMessage"
        >
          <template #extra>
            <a-space direction="vertical" :size="16">
              <a-button type="primary" size="large" @click="resetAndRetry">
                重新报名
              </a-button>
              <a-button size="large" @click="goBackToPromotion">
                返回宣传页
              </a-button>
            </a-space>
          </template>
        </a-result>
      </div>

      <!-- 报名表单 -->
      <div v-else-if="promotion" class="form-state">
        <!-- 页面头部 -->
        <div class="page-header">
          <a-button
            class="back-btn"
            type="text"
            @click="goBackToPromotion"
          >
            <icon-left />
            返回
          </a-button>
          <h2 class="page-title">{{ promotion.title }}</h2>
          <p class="page-subtitle">填写以下信息完成报名</p>
        </div>

        <!-- 表单区域 -->
        <div class="signup-form-wrapper">
          <a-form
            ref="formRef"
            :model="formData"
            layout="vertical"
            class="signup-form"
            :rules="formRules"
          >
            <!-- 基础信息 -->
            <div class="form-section">
              <h3 class="section-title">
                <icon-user />
                基本信息
              </h3>

              <a-form-item label="姓名" field="name" :rules="[{ required: true, message: '请输入您的姓名' }]">
                <a-input
                  v-model="formData.name"
                  placeholder="请输入您的姓名"
                  size="large"
                  allow-clear
                >
                  <template #prefix>
                    <icon-user />
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item label="手机号码" field="phone" :rules="[
                { required: true, message: '请输入手机号码' },
                { match: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
              ]">
                <a-input
                  v-model="formData.phone"
                  placeholder="请输入11位手机号码"
                  size="large"
                  allow-clear
                  maxlength="11"
                >
                  <template #prefix>
                    <icon-phone />
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item
                v-if="availableClasses.length > 0"
                label="报名班次"
                field="class_id"
                :rules="[{ required: true, message: '请选择报名班次' }]"
              >
                <a-select
                  v-model="formData.class_id"
                  placeholder="请选择报名班次"
                  size="large"
                  allow-clear
                >
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
                    <span v-if="cls.max_count && cls.current_count >= cls.max_count" class="class-full-tag">
                      已满
                    </span>
                  </a-option>
                </a-select>
              </a-form-item>
            </div>

            <!-- 自定义字段 -->
            <div v-if="customFields.length > 0" class="form-section custom-fields-section">
              <h3 class="section-title">
                <icon-edit />
                补充信息
              </h3>

              <template v-for="field in customFields" :key="field.name">
                <a-form-item
                  :label="field.label"
                  :field="`custom_fields.${field.name}`"
                  :rules="field.required ? [{ required: true, message: `请${field.type === 'select' ? '选择' : '输入'}${field.label}` }] : []"
                >
                  <!-- 文本输入 -->
                  <a-input
                    v-if="field.type === 'text' || field.type === 'email'"
                    v-model="formData.custom_fields[field.name]"
                    :placeholder="`请输入${field.label}`"
                    size="large"
                    :type="field.type === 'email' ? 'text' : 'text'"
                    allow-clear
                  />

                  <!-- 多行文本 -->
                  <a-textarea
                    v-else-if="field.type === 'textarea'"
                    v-model="formData.custom_fields[field.name]"
                    :placeholder="`请输入${field.label}`"
                    size="large"
                    :auto-size="{ minRows: 3, maxRows: 6 }"
                    show-word-limit
                    :max-length="500"
                  />

                  <!-- 数字 -->
                  <a-input-number
                    v-else-if="field.type === 'number'"
                    v-model="formData.custom_fields[field.name]"
                    :placeholder="`请输入${field.label}`"
                    size="large"
                    style="width: 100%"
                  />

                  <!-- 下拉选择 -->
                  <a-select
                    v-else-if="field.type === 'select'"
                    v-model="formData.custom_fields[field.name]"
                    :placeholder="`请选择${field.label}`"
                    size="large"
                    allow-clear
                  >
                    <a-option v-for="opt in (field.options || [])" :key="opt" :value="opt">
                      {{ opt }}
                    </a-option>
                  </a-select>

                  <!-- 单选 -->
                  <a-radio-group
                    v-else-if="field.type === 'radio'"
                    v-model="formData.custom_fields[field.name]"
                    direction="vertical"
                    :options="(field.options || []).map(opt => ({ label: opt, value: opt }))"
                  />

                  <!-- 多选 -->
                  <a-checkbox-group
                    v-else-if="field.type === 'checkbox'"
                    v-model="formData.custom_fields[field.name]"
                    direction="vertical"
                  >
                    <a-checkbox v-for="opt in (field.options || [])" :key="opt" :value="opt">
                      {{ opt }}
                    </a-checkbox>
                  </a-checkbox-group>

                  <!-- 日期 -->
                  <a-date-picker
                    v-else-if="field.type === 'date'"
                    v-model="formData.custom_fields[field.name]"
                    :placeholder="`请选择${field.label}`"
                    size="large"
                    style="width: 100%"
                    format="YYYY-MM-DD"
                  />
                </a-form-item>
              </template>
            </div>

            <!-- 提交按钮 -->
            <div class="submit-area">
              <a-button
                type="primary"
                html-type="submit"
                size="large"
                block
                :loading="submitting"
                class="submit-btn"
                @click="handleSubmit"
              >
                <template #icon v-if="!submitting">
                  <icon-send />
                </template>
                {{ submitting ? '正在提交...' : '提交报名' }}
              </a-button>

              <p class="submit-hint">
                <icon-info-circle />
                提交后我们将通过手机号与您联系，请确保信息准确
              </p>
            </div>
          </a-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  IconUser,
  IconPhone,
  IconEdit,
  IconSend,
  IconLeft,
  IconInfoCircle
} from '@arco-design/web-vue/es/icon'
import { getPromotionPublic, createPromotionSignup } from '@/api'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const loading = ref(true)
const error = ref(null)
const promotion = ref(null)
const submitting = ref(false)
const signupSuccess = ref(false)
const signupError = ref(false)
const signupErrorMessage = ref('')
const autoReply = ref(null)

const formData = reactive({
  name: '',
  phone: '',
  class_id: '',
  custom_fields: {}
})

const formRules = {
  name: [{ required: true, message: '请输入您的姓名' }],
  phone: [
    { required: true, message: '请输入手机号码' },
    { match: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
  ]
}

const availableClasses = computed(() => {
  return promotion.value?.signup_config?.classes || []
})

const customFields = computed(() => {
  return promotion.value?.signup_config?.fields || []
})

const goBackToPromotion = () => {
  router.push({
    name: 'PromotionPublic',
    params: { id: route.params.id }
  })
}

const resetForm = () => {
  formData.name = ''
  formData.phone = ''
  formData.class_id = ''
  formData.custom_fields = {}
  signupSuccess.value = false
  signupError.value = false
  signupErrorMessage.value = ''
  autoReply.value = null
}

const resetAndRetry = () => {
  resetForm()
}

const handleSubmit = async () => {
  try {
    const errors = await formRef.value?.validate()
    if (errors) return
  } catch (err) {
    return
  }

  submitting.value = true
  try {
    const submitData = {
      name: formData.name,
      phone: formData.phone,
      class_id: formData.class_id,
      ...formData.custom_fields
    }

    const res = await createPromotionSignup(promotion.value.id, submitData)

    if (res.success) {
      signupSuccess.value = true

      if (res.data?.auto_reply) {
        autoReply.value = res.data.auto_reply
      }

      Message.success('报名提交成功！')
    }
  } catch (err) {
    signupError.value = true
    signupErrorMessage.value = err.message || '网络错误，请稍后重试'
    Message.error(signupErrorMessage.value)
  } finally {
    submitting.value = false
  }
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

      if (!promotion.value.enable_signup) {
        error.value = { message: '该活动未开启报名功能' }
      } else if (promotion.value.signup_ended) {
        error.value = { message: '报名已截止' }
      } else if (promotion.value.status === 'archived') {
        error.value = { message: '该项目已归档' }
      }
    }
  } catch (err) {
    error.value = {
      message: err.response?.data?.message || '获取活动信息失败',
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
.promotion-signup-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.signup-container {
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  position: relative;
}

.loading-state,
.error-state,
.form-state,
.success-state {
  padding: 40px 32px;
}

/* 页面头部 */
.page-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
}

.back-btn {
  position: absolute;
  left: -8px;
  top: -8px;
  font-size: 15px;
  color: #666;
  transition: all 0.3s ease;
}

.back-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  line-height: 1.3;
}

.page-subtitle {
  font-size: 15px;
  color: #666;
  margin: 0;
}

/* 表单样式 */
.signup-form-wrapper {
  background: #fafbfc;
  border-radius: 12px;
  padding: 28px 24px;
}

.signup-form {
  width: 100%;
}

.form-section {
  margin-bottom: 28px;
}

.form-section:last-of-type {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e8ecf1;
}

.section-title .arco-icon {
  color: #667eea;
  font-size: 20px;
}

.custom-fields-section {
  margin-top: 32px;
  padding-top: 28px;
  border-top: 1px dashed #ddd;
}

/* 输入框增强样式 */
.signup-form :deep(.arco-input),
.signup-form :deep(.arco-textarea),
.signup-form :deep(.arco-select) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.signup-form :deep(.arco-input-wrapper):hover,
.signup-form :deep(.arco-textarea-wrapper):hover,
.signup-form :deep(.arco-select-view-hover) {
  border-color: #667eea;
}

.signup-form :deep(.arco-input-wrapper-focus),
.signup-form :deep(.arco-textarea-wrapper-focus),
.signup-form :deep(.arco-select-view-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 班次选择样式 */
.class-quota {
  margin-left: 8px;
  color: #999;
  font-size: 13px;
}

.class-full-tag {
  margin-left: 8px;
  padding: 2px 8px;
  background: #ffece8;
  color: #f53f3f;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* 提交区域 */
.submit-area {
  margin-top: 28px;
  text-align: center;
}

.submit-btn {
  height: 52px !important;
  font-size: 17px !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.25);
  transition: all 0.3s ease !important;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(102, 126, 234, 0.35) !important;
}

.submit-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 13px;
  color: #999;
}

.submit-hint .arco-icon {
  font-size: 14px;
}

/* 成功状态 */
.success-state {
  text-align: center;
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 0;
}

.success-circle {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(82, 196, 26, 0.15) 0%, transparent 70%);
  animation: successPulse 2s ease-out infinite;
}

.success-circle.delay-1 {
  animation-delay: 0.5s;
  width: 280px;
  height: 280px;
}

.success-circle.delay-2 {
  animation-delay: 1s;
  width: 360px;
  height: 360px;
}

@keyframes successPulse {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

.success-state :deep(.arco-result) {
  position: relative;
  z-index: 1;
}

/* 错误状态 */
.error-state {
  text-align: center;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .promotion-signup-page {
    padding: 0;
    background: #fff;
  }

  .signup-container {
    border-radius: 0;
    box-shadow: none;
    min-height: 100vh;
  }

  .loading-state,
  .error-state,
  .form-state,
  .success-state {
    padding: 24px 16px;
  }

  .page-header {
    padding-top: 16px;
  }

  .page-title {
    font-size: 22px;
  }

  .signup-form-wrapper {
    padding: 20px 16px;
  }

  .section-title {
    font-size: 16px;
  }

  .submit-btn {
    height: 48px !important;
    font-size: 16px !important;
  }
}
</style>
