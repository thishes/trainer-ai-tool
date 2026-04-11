<template>
  <div class="promotion-view">
    <a-spin :loading="loading">
      <a-result v-if="notFound" status="404" title="文案不存在" sub-title="该报名文案已下架或不存在">
        <template #extra>
          <a-button type="primary" @click="$router.push('/')">返回首页</a-button>
        </template>
      </a-result>
      <a-result v-else-if="loadError" status="error" title="加载失败" sub-title="请稍后重试">
        <template #extra>
          <a-button type="primary" @click="loadPromotion">重新加载</a-button>
        </template>
      </a-result>
      <div class="promotion-content" v-else-if="promotion">
        <h1 class="promotion-title">{{ promotion.title }}</h1>
        <SafeHtml :html="promotion.content" class="promotion-body" />
        <div class="promotion-action" v-if="promotion.enable_signup">
          <a-button v-if="!showSignupForm" type="primary" size="large" @click="showSignupForm = true">
            立即报名
          </a-button>
          <a-card v-if="showSignupForm" class="signup-card">
            <a-result v-if="signupSuccess" status="success" title="报名成功" sub-title="我们已收到您的报名信息，请保持手机畅通">
              <template #extra>
                <a-button type="primary" @click="showSignupForm = false; signupSuccess = false">关闭</a-button>
              </template>
            </a-result>
            <a-form v-else :model="signupForm" layout="vertical" @submit="handleSignup">
              <a-form-item label="姓名" required>
                <a-input v-model="signupForm.name" placeholder="请输入您的姓名" />
              </a-form-item>
              <a-form-item label="手机号" required>
                <a-input v-model="signupForm.phone" placeholder="请输入您的手机号" />
              </a-form-item>
              <a-form-item>
                <a-space>
                  <a-button type="primary" html-type="submit" :loading="submitting" :disabled="submitting">
                    提交报名
                  </a-button>
                  <a-button @click="showSignupForm = false">取消</a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </a-card>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import SafeHtml from '@/components/SafeHtml.vue'
import { getPromotion, signupPromotion } from '@/api'

export default {
  components: { SafeHtml },
  name: 'PromotionView',
  setup() {
    const route = useRoute()
    const loading = ref(true)
    const notFound = ref(false)
    const loadError = ref(false)
    const promotion = ref(null)
    const showSignupForm = ref(false)
    const signupSuccess = ref(false)
    const submitting = ref(false)
    const signupForm = ref({
      name: '',
      phone: ''
    })

    const loadPromotion = async () => {
      loading.value = true
      notFound.value = false
      loadError.value = false
      try {
        const res = await getPromotion(route.params.id)
        if (res.data) {
          promotion.value = res.data
        } else {
          notFound.value = true
        }
      } catch (e) {
        if (e.response?.status === 404) {
          notFound.value = true
        } else {
          loadError.value = true
        }
      } finally {
        loading.value = false
      }
    }

    const handleSignup = async () => {
      if (!signupForm.value.name.trim()) {
        Message.warning('请输入姓名')
        return
      }
      if (!signupForm.value.phone.trim()) {
        Message.warning('请输入手机号')
        return
      }
      const phoneReg = /^1[3-9]\d{9}$/
      if (!phoneReg.test(signupForm.value.phone)) {
        Message.warning('请输入正确的手机号')
        return
      }
      submitting.value = true
      try {
        await signupPromotion(route.params.id, signupForm.value)
        signupSuccess.value = true
        signupForm.value = { name: '', phone: '' }
      } catch (e) {
        Message.error(e.message || '报名失败，请稍后重试')
      } finally {
        submitting.value = false
      }
    }

    onMounted(() => {
      loadPromotion()
    })

    return {
      loading,
      notFound,
      loadError,
      promotion,
      showSignupForm,
      signupSuccess,
      submitting,
      signupForm,
      loadPromotion,
      handleSignup
    }
  }
}
</script>

<style scoped>
.promotion-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}
.promotion-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
}
.promotion-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
  text-align: center;
}
.promotion-body {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
  margin-bottom: 24px;
}
.promotion-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
}
.promotion-body :deep(p) {
  margin: 12px 0;
}
.promotion-action {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-color-light);
}
.signup-card {
  max-width: 400px;
  margin: 0 auto;
  text-align: left;
}
</style>
