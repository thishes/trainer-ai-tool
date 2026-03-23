<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h1>AI考试平台</h1>
      <p class="login-subtitle">登录以开始管理您的在线考试</p>
      <a-form :model="form" @submit.prevent="handleLogin">
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
          <a-button type="primary" style="width: 100%" :loading="loading" @click="handleLogin">
            登录
          </a-button>
        </a-form-item>
        <a-form-item>
          <a-button type="text" @click="showRegister = true">没有账号？注册</a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-modal v-model:visible="showRegister" title="注册" :width="400" @before-ok="handleRegister" @cancel="showRegister = false" :ok-text="'注册'" :cancel-text="'取消'">
      <a-form :model="registerForm" layout="vertical">
        <a-form-item label="用户名">
          <a-input v-model="registerForm.username" placeholder="用户名" />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model="registerForm.password" placeholder="密码" />
        </a-form-item>
        <a-form-item label="手机号（可选）">
          <a-input v-model="registerForm.phone" placeholder="手机号" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { login, register } from '@/api'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const showRegister = ref(false)
    const form = ref({ username: '', password: '' })
    const registerForm = ref({ username: '', password: '', phone: '' })

    const handleLogin = async () => {
      if (!form.value.username || !form.value.password) {
        Message.warning('请输入用户名和密码')
        return
      }
      loading.value = true
      try {
        const res = await login(form.value)
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        Message.success('登录成功')
        router.push('/dashboard')
      } catch (error) {
        Message.error(error.response?.data?.message || '登录失败')
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
        loading.value = true
        try {
          await register(registerForm.value)
          Message.success('注册成功，请登录')
          showRegister.value = false
          form.value.username = registerForm.value.username
          done(true)
        } catch (error) {
          Message.error(error.response?.data?.message || '注册失败')
          done(false)
        } finally {
          loading.value = false
        }
      })()
    }

    return { loading, showRegister, form, registerForm, handleLogin, handleRegister }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('/login-bg2.png') no-repeat center center;
  background-size: cover;
  position: relative;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(22, 93, 255, 0.15);
}

.login-box {
  position: relative;
  background: var(--bg-color-white);
  padding: 36px;
  border-radius: var(--radius-lg);
  width: 360px;
  box-shadow: var(--shadow-dropdown);
}

.login-icon {
  width: 48px;
  height: 48px;
  background: var(--color-primary);
  border-radius: var(--radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.login-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.login-box h1 {
  text-align: center;
  margin-bottom: 6px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.login-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 24px;
}

:deep(.arco-input-wrapper) {
  padding: 12px 14px;
  border-radius: var(--radius-base);
}

:deep(.arco-btn--primary) {
  width: 100%;
  height: 40px;
  font-size: 14px;
  font-weight: 500;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-base);
  margin-top: 6px;
}

:deep(.arco-btn--primary:hover) {
  background: var(--color-primary-dark);
}

:deep(.arco-input) {
  font-size: 14px;
}

:deep(.arco-form-item) {
  margin-bottom: 16px;
}

:deep(.arco-modal) {
  border-radius: var(--radius-lg);
}
</style>