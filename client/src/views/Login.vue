<template>
  <div class="login-container">
    <div class="login-box">
      <a-skeleton :animation="true" v-if="pageLoading">
        <div style="text-align: center; padding: 40px 0;">
          <a-skeleton-shape style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px;" />
          <a-skeleton-shape style="width: 200px; height: 32px; margin: 0 auto 10px;" />
          <a-skeleton-shape style="width: 150px; height: 20px; margin: 0 auto;" />
        </div>
      </a-skeleton>
      <template v-else>
        <div class="login-icon">
          <img src="/logo.png" alt="logo" style="width: 40px; height: 40px; object-fit: contain;" />
        </div>
        <h1>培训师小助手</h1>
        <p class="login-subtitle">登录感受教学数字化</p>
      </template>
      <a-form :model="form" @submit="handleLogin">
        <a-form-item>
          <a-input v-model="form.username" placeholder="用户名" size="large">
            <template #prefix>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item>
          <a-input-password v-model="form.password" placeholder="密码" size="large">
            <template #prefix>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </template>
          </a-input-password>
        </a-form-item>
        <a-form-item>
          <div class="captcha-wrapper">
            <a-input v-model="form.captchaCode" placeholder="验证码" size="large" class="captcha-input" @keyup.enter="handleLogin">
              <template #prefix>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </template>
            </a-input>
            <div class="captcha-display" @click="refreshCaptcha" :title="'点击刷新验证码'">
              {{ captchaDisplay }}
            </div>
          </div>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loading" style="width: 100%; height: 40px; font-size: 15px;" @click="handleLogin">
            登录
          </a-button>
        </a-form-item>
        <div class="login-register-link">
          <a-button type="text" size="small" @click="showRegister = true">没有账号？注册</a-button>
        </div>
      </a-form>
    </div>
    <div class="login-footer">
      <span>培训师小助手 v{{ APP_VERSION }}</span>
      <span class="divider">|</span>
      <span>&copy; 2026 Thishe. All Rights Reserved.</span>
    </div>

    <a-modal v-model:visible="showRegister" title="注册" :width="380" @before-ok="handleRegister" @cancel="showRegister = false" :ok-text="'注册'" :cancel-text="'取消'">
      <a-form :model="registerForm" layout="vertical">
        <a-form-item label="用户名" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model="registerForm.username" placeholder="请输入用户名" />
        </a-form-item>
        <a-form-item label="密码" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model="registerForm.password" placeholder="请输入密码（至少6位）" />
        </a-form-item>
        <a-form-item label="手机号（可选）">
          <a-input v-model="registerForm.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="验证码">
          <div class="captcha-wrapper">
            <a-input v-model="registerForm.captchaCode" placeholder="验证码" class="captcha-input" />
            <div class="captcha-display" @click="refreshRegisterCaptcha">
              {{ registerCaptchaDisplay }}
            </div>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { login, register, getCaptcha } from '@/api'
import { APP_VERSION } from '@/version'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const pageLoading = ref(true)
    const showRegister = ref(false)
    const form = ref({ username: '', password: '', captchaCode: '', captchaId: '' })
    const registerForm = ref({ username: '', password: '', phone: '', captchaCode: '', captchaId: '' })
    const captchaDisplay = ref('------')
    const registerCaptchaDisplay = ref('------')

    const refreshCaptcha = async () => {
      try {
        const res = await getCaptcha()
        if (res.data && res.data.captchaId) {
          form.value.captchaId = res.data.captchaId
          captchaDisplay.value = (res.data.code || '').slice(0, 6).toUpperCase()
        }
      } catch (e) {
        console.error('获取验证码失败', e)
      }
    }

    const refreshRegisterCaptcha = async () => {
      try {
        const res = await getCaptcha()
        if (res.data && res.data.captchaId) {
          registerForm.value.captchaId = res.data.captchaId
          registerCaptchaDisplay.value = (res.data.code || '').slice(0, 6).toUpperCase()
        }
      } catch (e) {
        console.error('获取验证码失败', e)
      }
    }

    const handleLogin = async () => {
      if (!form.value.username || !form.value.password) {
        Message.warning('请输入用户名和密码')
        return
      }
      if (!form.value.captchaCode) {
        Message.warning('请输入验证码')
        return
      }
      loading.value = true
      try {
        const res = await login(form.value)
        if (res.data && res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user))
          localStorage.setItem('token', res.data.token || '')
          localStorage.setItem('loggedIn', 'true')
        }
        Message.success('登录成功')
        router.push('/dashboard')
      } catch (error) {
        Message.error(error.response?.data?.message || '登录失败')
        refreshCaptcha()
      } finally {
        loading.value = false
      }
    }

    const handleRegister = (done) => {
      (async () => {
        if (!registerForm.value.username || !registerForm.value.password) {
          Message.warning('请输入用户名和密码')
          done(false)
          return
        }
        if (!registerForm.value.captchaCode) {
          Message.warning('请输入验证码')
          done(false)
          return
        }
        loading.value = true
        try {
          await register(registerForm.value)
          Message.success('注册成功，请登录')
          showRegister.value = false
          form.value.username = registerForm.value.username
          registerForm.value = { username: '', password: '', phone: '', captchaCode: '', captchaId: '' }
          done(true)
        } catch (error) {
          Message.error(error.response?.data?.message || '注册失败')
          refreshRegisterCaptcha()
          done(false)
        } finally {
          loading.value = false
        }
      })()
    }

    onMounted(() => {
      refreshCaptcha()
      refreshRegisterCaptcha()
      pageLoading.value = false
    })

    return {
      loading,
      pageLoading,
      showRegister,
      form,
      registerForm,
      handleLogin,
      handleRegister,
      APP_VERSION,
      captchaDisplay,
      registerCaptchaDisplay,
      refreshCaptcha,
      refreshRegisterCaptcha
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: url('/login-bg2.webp') no-repeat center center;
  background-size: cover;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(22, 93, 255, 0.15);
  backdrop-filter: blur(2px);
}

.login-box {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 40px 32px;
  border-radius: 16px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.login-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #0d47a1 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.3);
}

.login-box h1 {
  text-align: center;
  margin-bottom: 6px;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.login-subtitle {
  text-align: center;
  color: #666;
  font-size: 13px;
  margin-bottom: 28px;
}

.captcha-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.captcha-input {
  flex: 1;
}

.captcha-display {
  min-width: 100px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
  color: var(--color-primary);
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
  cursor: pointer;
  user-select: none;
  border: 1px solid #d0d9ff;
  transition: all 0.2s ease;
}

.captcha-display:hover {
  background: linear-gradient(135deg, var(--color-primary) 0%, #0d47a1 100%);
  color: #fff;
  border-color: var(--color-primary);
  transform: scale(1.02);
}

.login-register-link {
  text-align: center;
  margin-top: 8px;
}

.login-footer {
  position: relative;
  z-index: 1;
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.login-footer .divider {
  opacity: 0.6;
}

:deep(.arco-form-item) {
  margin-bottom: 18px;
}

:deep(.arco-row) {
  display: flex;
  flex-wrap: wrap;
}

:deep(.arco-form-item-label-col) {
  display: none;
}

:deep(.arco-col-19) {
  flex: 0 0 100%;
  max-width: 100%;
}

:deep(.arco-input-wrapper) {
  border-radius: 8px;
}

:deep(.arco-input-wrapper:hover),
:deep(.arco-input-wrapper.arco-input-wrapper-focus) {
  border-color: var(--color-primary);
}

:deep(.arco-btn--primary) {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 500;
  background: linear-gradient(135deg, var(--color-primary) 0%, #0d47a1 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(22, 93, 255, 0.3);
  transition: all 0.2s ease;
}

:deep(.arco-btn--primary:hover) {
  background: linear-gradient(135deg, #1a65ff 0%, #0d47a1 100%);
  box-shadow: 0 6px 16px rgba(22, 93, 255, 0.4);
  transform: translateY(-1px);
}

:deep(.arco-modal) {
  border-radius: 16px;
}

:deep(.arco-modal-header) {
  border-radius: 16px 16px 0 0;
}

:deep(.arco-modal-content) {
  border-radius: 16px;
}

@media screen and (max-width: 420px) {
  .login-box {
    padding: 32px 24px;
    max-width: 100%;
  }

  .login-icon {
    width: 48px;
    height: 48px;
  }

  .login-box h1 {
    font-size: 20px;
  }

  .captcha-display {
    min-width: 80px;
    height: 36px;
    font-size: 14px;
  }

  .login-footer {
    flex-direction: column;
    gap: 4px;
  }

  .login-footer .divider {
    display: none;
  }
}
</style>
