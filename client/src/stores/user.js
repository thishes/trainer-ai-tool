// src/stores/user.js - 用户状态管理
// Token 通过 HttpOnly Cookie 管理，不再存储在 JS 可访问的 localStorage
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, register as registerApi, getCaptcha, getUserInfo, logout as logoutApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const loggedIn = ref(localStorage.getItem('loggedIn') === 'true')

  const isAdmin = computed(() => user.value?.role === 'admin')
  const username = computed(() => user.value?.username || '')
  const userId = computed(() => user.value?.id || null)

  async function login(form) {
    const res = await loginApi(form)
    if (res.data && res.data.user) {
      user.value = res.data.user
      loggedIn.value = true
      // Token 由服务端通过 HttpOnly Cookie 设置，前端无法读取
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('loggedIn', 'true')
    }
    return res
  }

  async function register(form) {
    return await registerApi(form)
  }

  async function fetchMe() {
    try {
      const res = await getUserInfo()
      if (res.data) {
        user.value = res.data
        localStorage.setItem('user', JSON.stringify(res.data))
      }
    } catch (e) {
      logout()
    }
  }

  async function logout() {
    try { await logoutApi() } catch (e) { /* ignore */ }
    user.value = null
    loggedIn.value = false
    localStorage.removeItem('user')
    localStorage.removeItem('loggedIn')
  }

  function getAvatarColor() {
    const colors = ['#165DFF', '#0FC6C2', '#F53F3F', '#F7BA1E', '#722ED1', '#00B42A']
    const index = user.value?.username?.charCodeAt(0) % colors.length || 0
    return colors[index]
  }

  return {
    user, loggedIn, isAdmin, username, userId,
    login, register, fetchMe, logout, getAvatarColor
  }
})
