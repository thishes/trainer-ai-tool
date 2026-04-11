<template>
  <div class="profile-page">
    <a-page-header title="用户中心" @back="goBack" />
    
    <a-tabs v-model:activeKey="activeTab" class="profile-tabs">
      <a-tab-pane key="basic" title="基本信息">
        <a-card class="profile-card" :bordered="false">
          <a-form :model="profileForm" layout="vertical" @submit="saveProfile">
            <a-row :gutter="24">
              <a-col :span="8">
                <a-form-item label="头像">
                  <div class="avatar-upload">
                    <a-avatar :size="80" :style="{ backgroundColor: avatarColor }">
                      {{ profileForm.username?.charAt(0).toUpperCase() }}
                    </a-avatar>
                    <div class="avatar-tip">暂不支持修改</div>
                  </div>
                </a-form-item>
              </a-col>
              <a-col :span="16">
                <a-form-item label="用户名">
                  <a-input v-model="profileForm.username" disabled />
                  <div class="form-tip">用户名不可修改</div>
                </a-form-item>
                
                <a-form-item label="角色">
                  <a-select v-model="profileForm.role" disabled>
                    <a-option value="admin">管理员</a-option>
                    <a-option value="trainer">培训师</a-option>
                    <a-option value="student">学员</a-option>
                  </a-select>
                  <div class="form-tip">角色不可修改</div>
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-divider />
            
            <a-form-item label="手机号">
              <a-input v-model="profileForm.phone" placeholder="请输入手机号" style="max-width: 300px" />
              <div class="form-tip">用于接收通知和找回密码</div>
            </a-form-item>
            
            <a-form-item>
              <a-space>
                <a-button type="primary" html-type="submit" :loading="saving">
                  {{ saving ? '保存中...' : '保存修改' }}
                </a-button>
                <a-button @click="resetForm">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>
      </a-tab-pane>
      
      <a-tab-pane key="security" title="安全中心">
        <a-card class="profile-card" :bordered="false">
          <a-form :model="passwordForm" layout="vertical" @submit="changePassword">
            <a-form-item label="当前密码" required>
              <a-input-password v-model="passwordForm.oldPassword" placeholder="请输入当前密码" style="max-width: 300px" />
            </a-form-item>
            
            <a-form-item label="新密码" required>
              <a-input-password v-model="passwordForm.newPassword" placeholder="请输入新密码（至少 6 位）" @input="checkPasswordStrength" style="max-width: 300px" />
              <div class="password-strength" v-if="passwordForm.newPassword">
                <div class="strength-bar">
                  <div class="strength-fill" :style="{ width: passwordStrength.percent + '%', backgroundColor: passwordStrength.color }"></div>
                </div>
                <span :style="{ color: passwordStrength.color }">{{ passwordStrength.text }}</span>
              </div>
              <div class="form-tip">密码长度至少 6 位，建议包含大小写字母、数字和特殊字符</div>
            </a-form-item>
            
            <a-form-item label="确认新密码" required>
              <a-input-password v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" style="max-width: 300px" />
            </a-form-item>
            
            <a-alert type="info" style="max-width: 300px; margin-bottom: 16px;" v-if="canChangePassword">
              修改密码后需要重新登录
            </a-alert>
            
            <a-form-item>
              <a-button type="primary" html-type="submit" :loading="changingPwd" :disabled="!canChangePassword">
                {{ changingPwd ? '修改中...' : '修改密码' }}
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { getUserInfo, updateUser, changePassword as apiChangePassword } from '@/api'

const router = useRouter()

const activeTab = ref('basic')
const loading = ref(true)
const saving = ref(false)
const changingPwd = ref(false)
const profileForm = ref({
  username: '',
  role: 'trainer',
  phone: '',
  avatar: '',
  id: 0
})
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordStrength = ref({
  percent: 0,
  text: '',
  color: '#999'
})

// 计算属性
const avatarColor = computed(() => {
  const colors = ['#165DFF', '#0FC6C2', '#F53F3F', '#F7BA1E', '#722ED1', '#00B42A']
  const index = profileForm.value.username?.charCodeAt(0) % colors.length || 0
  return colors[index]
})

const canChangePassword = computed(() => {
  return passwordForm.value.oldPassword && 
         passwordForm.value.newPassword && 
         passwordForm.value.newPassword.length >= 6 &&
         passwordForm.value.newPassword === passwordForm.value.confirmPassword
})

// 方法
const goBack = () => {
  router.back()
}

const resetForm = () => {
  loadUserInfo()
  Message.success('已重置表单')
}

const loadUserInfo = async () => {
  loading.value = true
  try {
    const res = await getUserInfo()
    if (res.data) {
      profileForm.value = { ...res.data }
    }
  } catch (e) {
    console.error('加载用户信息失败:', e)
    Message.error('加载用户信息失败，请刷新页面重试')
  } finally {
    loading.value = false
  }
}

const saveProfile = () => {
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!profileForm.value.phone) {
    Message.warning('请输入手机号')
    return
  }
  if (!phoneRegex.test(profileForm.value.phone)) {
    Message.warning('手机号格式不正确，请输入 11 位手机号')
    return
  }
  
  Modal.confirm({
    title: '确认修改',
    content: '确定要修改手机号吗？修改后需要使用新手机号登录。',
    okText: '确认修改',
    cancelText: '取消',
    onOk: async () => {
      saving.value = true
      try {
        const res = await updateUser(profileForm.value.id, {
          phone: profileForm.value.phone
        })
        if (res.success) {
          Message.success('保存成功')
          localStorage.setItem('user', JSON.stringify({ id: profileForm.value.id, role: profileForm.value.role }))
        } else {
          if (res.message && res.message.includes('超级管理员')) {
            Message.warning('超级管理员信息不可修改')
          } else {
            Message.error(res.message || '保存失败')
          }
        }
      } catch (e) {
        console.error('保存失败:', e)
        if (e.response && e.response.status === 403) {
          const errorMsg = e.response.data?.message || e.response.data?.error || '无权限操作'
          if (errorMsg.includes('超级管理员')) {
            Message.warning('超级管理员信息不可修改')
          } else {
            Message.warning(errorMsg)
          }
        } else {
          Message.error('保存失败，请稍后重试')
        }
      } finally {
        saving.value = false
      }
    }
  })
}

const checkPasswordStrength = () => {
  const pwd = passwordForm.value.newPassword
  if (!pwd) {
    passwordStrength.value = { percent: 0, text: '', color: '#999' }
    return
  }
  
  let score = 0
  if (pwd.length >= 6) score += 1
  if (pwd.length >= 8) score += 1
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1
  if (/\d/.test(pwd)) score += 1
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1
  
  const levels = [
    { percent: 20, text: '太弱', color: '#F53F3F' },
    { percent: 40, text: '弱', color: '#F7BA1E' },
    { percent: 60, text: '一般', color: '#165DFF' },
    { percent: 80, text: '强', color: '#00B42A' },
    { percent: 100, text: '非常强', color: '#00B42A' }
  ]
  
  passwordStrength.value = levels[Math.min(score, 4)]
}

const changePassword = () => {
  if (!canChangePassword.value) {
    return
  }
  
  Modal.confirm({
    title: '确认修改密码',
    content: '确定要修改密码吗？修改后需要重新登录。',
    okText: '确认修改',
    cancelText: '取消',
    onOk: async () => {
      changingPwd.value = true
      try {
        const res = await apiChangePassword({
          oldPassword: passwordForm.value.oldPassword,
          newPassword: passwordForm.value.newPassword
        })
        if (res.success) {
          localStorage.removeItem('loggedIn')
          localStorage.removeItem('user')
          Message.success('密码修改成功，请重新登录')
          passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
          setTimeout(() => {
            window.location.href = '/login'
          }, 1500)
        } else {
          Message.error(res.message || '密码修改失败')
        }
      } catch (e) {
        console.error('密码修改失败:', e)
        Message.error('密码修改失败，请检查当前密码是否正确')
      } finally {
        changingPwd.value = false
      }
    }
  })
}

onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.profile-tabs {
  margin-top: 16px;
}

.profile-card {
  background: #fff;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.avatar-tip {
  font-size: 12px;
  color: var(--color-text-3);
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

/* 密码强度指示器 - 使用全局样式，仅自定义宽度 */
.password-strength .strength-bar {
  width: 120px;
  height: 6px;
}
</style>
