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
      <a-form :model="form" @submit-success="handleLogin">
        <a-form-item field="username" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model="form.username" placeholder="用户名" size="large">
            <template #prefix>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item field="password" :rules="[{ required: true, message: '请输入密码' }, { minLength: 6, message: '密码至少6位' }]">
          <a-input-password v-model="form.password" placeholder="密码" size="large">
            <template #prefix>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </template>
          </a-input-password>
        </a-form-item>
        <a-form-item field="captchaCode" :rules="[{ required: true, message: '请输入验证码' }]">
          <div class="captcha-wrapper">
            <a-input v-model="form.captchaCode" placeholder="验证码" size="large" class="captcha-input">
              <template #prefix>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </template>
            </a-input>
            <div class="captcha-display" @click="refreshCaptcha" :title="'点击刷新验证码'">
              <img v-if="captchaSvg" :src="captchaSvg" alt="验证码" class="captcha-img" />
              <span v-else>{{ captchaDisplay }}</span>
            </div>
          </div>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="loading" html-type="submit" style="width: 100%; height: 40px; font-size: 15px;">
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
          <a-input-password v-model="registerForm.password" placeholder="请输入密码（至少6位）" @input="onRegisterPasswordInput" />
          <div v-if="registerForm.password" class="password-strength">
            <div class="strength-bar">
              <div class="strength-fill" :style="{ width: passwordStrength.percent + '%', background: passwordStrength.color }"></div>
            </div>
            <span class="strength-text" :style="{ color: passwordStrength.color }">{{ passwordStrength.label }}</span>
          </div>
        </a-form-item>
        <a-form-item label="手机号（可选）">
          <a-input v-model="registerForm.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="验证码">
          <div class="captcha-wrapper">
            <a-input v-model="registerForm.captchaCode" placeholder="验证码" class="captcha-input" />
            <div class="captcha-display" @click="refreshRegisterCaptcha">
              <img v-if="registerCaptchaSvg" :src="registerCaptchaSvg" alt="验证码" class="captcha-img" />
              <span v-else>{{ registerCaptchaDisplay }}</span>
            </div>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
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
    const captchaSvg = ref('')
    const registerCaptchaSvg = ref('')

    // 密码强度计算
    const passwordStrength = computed(() => {
      const pwd = registerForm.value.password
      if (!pwd) return { percent: 0, label: '', color: '#c9cdd4' }
      let score = 0
      if (pwd.length >= 6) score++
      if (pwd.length >= 10) score++
      if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
      if (/\d/.test(pwd)) score++
      if (/[^a-zA-Z0-9]/.test(pwd)) score++
      const levels = [
        { percent: 20, label: '非常弱', color: '#f53f3f' },
        { percent: 40, label: '弱', color: '#ff7d00' },
        { percent: 60, label: '一般', color: '#ffb400' },
        { percent: 80, label: '强', color: '#00b42a' },
        { percent: 100, label: '非常强', color: '#009a29' }
      ]
      return levels[Math.min(score, 4)]
    })

    const onRegisterPasswordInput = () => {
      // 触发 computed 重新计算
    }

    const refreshCaptcha = async () => {
      try {
        const res = await getCaptcha()
        if (res.data && res.data.captchaId) {
          form.value.captchaId = res.data.captchaId
          if (res.data.svg) {
            captchaSvg.value = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(res.data.svg)))
            captchaDisplay.value = ''
          } else {
            captchaSvg.value = ''
            captchaDisplay.value = '------'
          }
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
          if (res.data.svg) {
            registerCaptchaSvg.value = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(res.data.svg)))
            registerCaptchaDisplay.value = ''
          } else {
            registerCaptchaSvg.value = ''
            registerCaptchaDisplay.value = '------'
          }
        }
      } catch (e) {
        console.error('获取验证码失败', e)
      }
    }

    const handleLogin = async () => {
      loading.value = true
      try {
        const res = await login(form.value)
        console.log('[Login] Response:', res)
        console.log('[Login] res.data:', res?.data)
        console.log('[Login] res.data.user:', res?.data?.user)
        if (res?.data?.user) {
          // 保存 token 到 localStorage（用于 Authorization header，双重保障）
          if (res.data.token) {
            localStorage.setItem('token', res.data.token)
          } else {
            localStorage.removeItem('token')
          }
          localStorage.setItem('user', JSON.stringify(res.data.user))
          localStorage.setItem('loggedIn', 'true')
          
          // 验证认证是否生效（Cookie 或 Authorization header）
          try {
            const verifyRes = await fetch('/api/auth/me', { credentials: 'include' })
            if (!verifyRes.ok) {
              console.error('[Login] Cookie verification failed:', verifyRes.status)
              // Cookie 方式失败，尝试 Authorization header 方式
              if (res.data.token) {
                const headerRes = await fetch('/api/auth/me', {
                  headers: { 'Authorization': 'Bearer ' + res.data.token }
                })
                if (headerRes.ok) {
                  console.log('[Login] Authorization header works, proceeding')
                  Message.success('登录成功')
                  router.push('/dashboard')
                  return
                }
              }
              Message.error('登录验证失败，请重试')
              localStorage.removeItem('loggedIn')
              localStorage.removeItem('user')
              localStorage.removeItem('token')
              return
            }
            const verifyData = await verifyRes.json()
            console.log('[Login] Auth verified, user:', verifyData.data?.username)
          } catch (e) {
            console.warn('[Login] Auth verification error:', e.message)
          }
          
          Message.success('登录成功')
          router.push('/dashboard')
        } else {
          console.error('[Login] No user in response:', res)
          Message.error('登录响应异常')
        }
      } catch (error) {
        console.error('[Login] Error:', error)
        // axios 拦截器已将错误转为 Error 对象，用 error.message 获取消息
        const msg = error.response?.data?.message || error.message || '登录失败'
        // 验证错误时显示具体字段
        const details = error.response?.data?.details
        if (details && details.length > 0) {
          Message.error(details.map(d => d.message).join('; '))
        } else {
          Message.error(msg)
        }
        // 验证码错误后仅清空验证码，保留用户名和密码
        form.value.captchaCode = ''
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
          Message.error(error.response?.data?.message || error.message || '注册失败')
          registerForm.value.captchaCode = ''
          refreshRegisterCaptcha()
          done(false)
        } finally {
          loading.value = false
        }
      })()
    }

    onMounted(() => {
      refreshCaptcha()
      // 注册验证码延迟到打开注册弹窗时加载
      pageLoading.value = false
    })

    // 监听注册弹窗打开，延迟加载验证码
    watch(showRegister, (val) => {
      if (val && !registerCaptchaSvg.value && registerCaptchaDisplay.value === '------') {
        refreshRegisterCaptcha()
      }
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
      captchaSvg,
      registerCaptchaSvg,
      refreshCaptcha,
      refreshRegisterCaptcha,
      passwordStrength,
      onRegisterPasswordInput
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

.captcha-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.login-register-link {
  text-align: center;
  margin-top: 8px;
}

/* 密码强度指示器 - 使用全局样式 */
.password-strength {
  margin-top: 6px;
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
