import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true
})

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 4000,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  retryNetworkErrors: ['ECONNABORTED', 'ETIMEDOUT', 'Network Error']
}

let retryCounts = new Map()

// CSRF Token 管理
let csrfToken = null

// 获取 CSRF Token
export async function initCsrfToken() {
  try {
    const response = await api.get('/auth/csrf-token')
    if (response.success) {
      csrfToken = response.csrfToken
      console.log('[API] CSRF Token initialized')
    }
  } catch (error) {
    console.warn('[API] Failed to get CSRF token:', error.message)
  }
}

function getRetryCount(config) {
  const key = `${config.method}_${config.url}`
  return retryCounts.get(key) || 0
}

function incrementRetryCount(config) {
  const key = `${config.method}_${config.url}`
  const current = retryCounts.get(key) || 0
  retryCounts.set(key, current + 1)
  return current + 1
}

function clearRetryCount(config) {
  const key = `${config.method}_${config.url}`
  retryCounts.delete(key)
}

function calculateDelay(retryCount) {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, retryCount)
  const jitter = Math.random() * 500
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

api.interceptors.request.use(config => {
  if (config._retryCount === undefined) {
    config._retryCount = 0
  }
  // 添加 CSRF Token 到请求头
  if (csrfToken && !config.skipCsrf) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

api.interceptors.response.use(
  response => {
    clearRetryCount(response.config)
    return response.data
  },
  async error => {
    const originalConfig = error.config || {}
    const status = error.response?.status
    const errorCode = error.code
    const isNetworkError = !error.response && error.message

    if (originalConfig._retryCount === undefined) {
      originalConfig._retryCount = 0
    }

    const shouldRetry =
      isNetworkError ||
      RETRY_CONFIG.retryNetworkErrors.includes(errorCode) ||
      (status && RETRY_CONFIG.retryStatusCodes.includes(status))

    const isAuthError = status === 401
    const isForbiddenError = status === 403
    const isNotFoundError = status === 404
    const isClientError = status && status >= 400 && status < 500 && !shouldRetry

    if (isAuthError || isForbiddenError || isNotFoundError || isClientError) {
      clearRetryCount(originalConfig)
    }

    if (shouldRetry && originalConfig._retryCount < RETRY_CONFIG.maxRetries) {
      originalConfig._retryCount++

      if (isNetworkError || errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT') {
        console.log(`[API] Network error, retrying (${originalConfig._retryCount}/${RETRY_CONFIG.maxRetries})...`)
      } else if (status) {
        console.log(`[API] Server error ${status}, retrying (${originalConfig._retryCount}/${RETRY_CONFIG.maxRetries})...`)
      }

      const delay = calculateDelay(originalConfig._retryCount - 1)
      await sleep(delay)

      try {
        const response = await api(originalConfig)
        clearRetryCount(originalConfig)
        return response
      } catch (retryError) {
        return Promise.reject(retryError)
      }
    }

    clearRetryCount(originalConfig)

    const message = error.response?.data?.message
    let errorMsg = message || '网络错误，请稍后重试'

    switch (status) {
      case 400:
        errorMsg = message || '请求参数错误'
        break
      case 401:
        const wasLoggedIn = localStorage.getItem('loggedIn') === 'true'
        console.warn('[API] 401 Unauthorized:', message, 'wasLoggedIn:', wasLoggedIn, 'path:', error.config?.url)
        localStorage.removeItem('user')
        localStorage.removeItem('loggedIn')
        localStorage.removeItem('token')
        errorMsg = message || '登录已过期，请重新登录'
        if (!window.location.pathname.includes('/login') && wasLoggedIn) {
          // 延迟跳转，避免在 axios 拦截器中动态 import router 造成循环依赖
          setTimeout(() => {
            window.location.href = '/login'
          }, 100)
        }
        break
      case 403:
        errorMsg = message || '没有权限执行此操作'
        break
      case 404:
        errorMsg = message || '请求的资源不存在'
        break
      case 408:
        errorMsg = '请求超时，请重试'
        break
      case 422:
        errorMsg = message || '请求数据验证失败'
        break
      case 429:
        errorMsg = '请求过于频繁，请稍后再试'
        break
      case 500:
        errorMsg = '服务器内部错误，请联系管理员'
        break
      case 502:
        errorMsg = '服务网关错误，请稍后重试'
        break
      case 503:
        errorMsg = '服务暂时不可用，请稍后重试'
        break
      case 504:
        errorMsg = '网关超时，请稍后重试'
        break
      default:
        if (!status) {
          errorMsg = '网络连接失败，请检查网络'
        }
    }

    return Promise.reject(new Error(errorMsg))
  }
)

export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const getCaptcha = () => api.get('/auth/captcha')
export const getUserInfo = () => api.get('/auth/me')
export const logout = () => api.post('/auth/logout')
export const refreshToken = () => api.post('/auth/refresh')

export const getQuestions = (params) => api.get('/questions', { params })
export const getQuestion = (id) => api.get(`/questions/${id}`)
export const createQuestion = (data) => api.post('/questions', data)
export const updateQuestion = (id, data) => api.put(`/questions/${id}`, data)
export const deleteQuestion = (id) => api.delete(`/questions/${id}`)
export const importQuestions = (data) => api.post('/questions/import', data)

export const getCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

export const getPapers = (params) => api.get('/papers', { params })
export const getPaper = (id) => api.get(`/papers/${id}`)
export const getPaperPublic = (id, params) => api.get(`/papers/public/${id}`, { params })
export const createPaper = (data) => api.post('/papers', data)
export const updatePaper = (id, data) => api.put(`/papers/${id}`, data)
export const deletePaper = (id) => api.delete(`/papers/${id}`)
export const publishPaper = (id) => api.post(`/papers/${id}/publish`)
export const unpublishPaper = (id) => api.post(`/papers/${id}/unpublish`)
export const createRandomPaper = (data) => api.post('/papers/random', data)
export const getPaperExamUrl = (id) => api.get(`/papers/${id}/exam-url`)
export const getPaperQuestions = (paperId) => api.get(`/papers/${paperId}/questions`)
export const addQuestionsToPaper = (paperId, questionIds) => api.post(`/papers/${paperId}/questions`, { question_ids: questionIds })
export const removeQuestionFromPaper = (paperId, questionId) => api.delete(`/papers/${paperId}/questions/${questionId}`)

export const startExamApi = (data) => api.post('/exam/start', data)
export const getExamQuestions = (examId) => api.get(`/exam/${examId}/questions`)
export const saveProgress = (data) => api.post('/exam/save-progress', data)
export const submitExam = (data) => api.post('/exam/submit', data)
export const getExamResult = (examId, options = {}) => api.get(`/exam/${examId}/result`, options)
export const getExamRecords = (paperId, params) => api.get(`/exam/records/${paperId}`, { params })
export const getExamStats = (paperId) => api.get(`/exam/stats/${paperId}`)
export const getPendingGrading = (paperId, params) => api.get(`/exam/pending-grading/${paperId}`, { params })
export const gradeEssay = (data) => api.post('/exam/grade-essay', data)

export const getAnnouncements = (params) => api.get('/announcements', { params })
export const getAnnouncement = (id) => api.get(`/announcements/${id}`)
export const createAnnouncement = (data) => api.post('/announcements', data)
export const updateAnnouncement = (id, data) => api.put(`/announcements/${id}`, data)
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`)
export const uploadAnnouncementImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/announcements/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const getStudents = (params) => api.get('/students', { params })
export const getStudent = (id) => api.get(`/students/${id}`)
export const createStudent = (data) => api.post('/students', data)
export const updateStudent = (id, data) => api.put(`/students/${id}`, data)
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const importStudents = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
export const getPaperStudents = (paperId) => api.get(`/students/paper/${paperId}`)
export const addPaperStudents = (paperId, studentIds) => api.post(`/students/paper/${paperId}`, { student_ids: studentIds })
export const removePaperStudent = (paperId, studentId) => api.delete(`/students/paper/${paperId}/${studentId}`)
export const clearPaperStudents = (paperId) => api.delete(`/students/paper/${paperId}/all`)
export const exportPaperStudents = (paperId) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || ''
  // 使用 fetch + credentials:'include' 让 Cookie 自动发送，不再需要 Authorization header
  return fetch(`${baseURL}/api/students/paper/${paperId}/export`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    },
    credentials: 'include'
  }).then(res => {
    if (!res.ok) throw new Error('导出失败')
    return res.blob()
  })
}
export const verifyStudent = (data) => api.post('/students/verify', data)

export default api

export const checkUpgrade = () => api.get('/upgrade/check')
export const doUpgrade = (version) => api.post('/upgrade/upgrade', { version })

export const getUsers = (params) => api.get('/users', { params })
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const lockUser = (id, status) => api.patch(`/users/${id}/status`, { status })
export const deleteUser = (id) => api.delete(`/users/${id}`)
export const changePassword = (data) => api.post('/users/change-password', data)

export const getSystemInfo = () => api.get('/system/info')
export const getSystemMetrics = () => api.get('/system/metrics')
export const getSystemStats = () => api.get('/system/stats')
export const getSystemLogs = (params) => api.get('/system/logs', { params })
export const clearSystemLogs = (type) => api.post('/system/clear-logs', { type })
export const getSystemDatabase = () => api.get('/system/database')
export const backupSystemDatabase = () => api.post('/system/database/backup')
export const getSystemUpgradeCheck = () => api.get('/system/upgrade/check')
export const doSystemUpgrade = (version) => api.post('/system/upgrade', { version })

export const getPromotions = (params) => api.get('/promotions', { params })
export const getPromotion = (id) => api.get(`/promotions/${id}`)
export const createPromotion = (data) => api.post('/promotions', data)
export const updatePromotion = (id, data) => api.put(`/promotions/${id}`, data)
export const deletePromotion = (id) => api.delete(`/promotions/${id}`)
export const lockPromotion = (id) => api.post(`/promotions/${id}/lock`)
export const unlockPromotion = (id) => api.post(`/promotions/${id}/unlock`)

// 预览功能
export const getPromotionPreview = (id) => api.get(`/promotions/${id}/preview`)

// 公开访问（无需登录）
export const getPromotionPublic = (id) => api.get(`/promotions/${id}/public`)

// 报名配置
export const updatePromotionSignupConfig = (id, data) => api.put(`/promotions/${id}/signup-config`, data)

// 报名管理
export const getPromotionSignups = (id, params) => api.get(`/promotions/${id}/signups`, { params })
export const createPromotionSignup = (id, data) => api.post(`/promotions/${id}/signups`, data)
export const signupPromotion = (id, data) => api.post(`/promotions/${id}/signups`, data)
export const createPromotionSignupManual = (id, data) => api.post(`/promotions/${id}/signups/manual`, data)
export const updatePromotionSignup = (id, signupId, data) => api.put(`/promotions/${id}/signups/${signupId}`, data)
export const deletePromotionSignup = (id, signupId) => api.delete(`/promotions/${id}/signups/${signupId}`)
export const updatePromotionSignupStatus = (id, signupId, status) => api.patch(`/promotions/${id}/signups/${signupId}/status`, { status })
export const exportPromotionSignups = (id) => api.get(`/promotions/${id}/signups/export`, { responseType: 'blob' })
export const getPromotionStats = (id, params) => api.get(`/promotions/${id}/stats`, { params })
export const batchUpdatePromotionSignupStatus = (id, data) => api.patch(`/promotions/${id}/signups/batch-status`, data)
export const queryPromotionSignup = (id, data) => api.post(`/promotions/${id}/signups/query`, data)
export const cancelPromotionSignup = (id, signupId, data) => api.post(`/promotions/${id}/signups/${signupId}/cancel`)

// ========== Courses ==========
export const getCourses = (params) => api.get('/courses', { params })
export const getCourse = (id) => api.get(`/courses/${id}`)
export const createCourse = (data) => api.post('/courses', data)
export const updateCourse = (id, data) => api.put(`/courses/${id}`, data)
export const deleteCourse = (id) => api.delete(`/courses/${id}`)
export const publishCourse = (id) => api.patch(`/courses/${id}/publish`)
export const getCourseChapters = (courseId) => api.get(`/courses/${courseId}/chapters`)
export const createChapter = (courseId, data) => api.post(`/courses/${courseId}/chapters`, data)
export const updateChapter = (courseId, chapterId, data) => api.put(`/courses/${courseId}/chapters/${chapterId}`, data)
export const deleteChapter = (courseId, chapterId) => api.delete(`/courses/${courseId}/chapters/${chapterId}`)
export const reorderChapters = (courseId, orders) => api.put(`/courses/${courseId}/chapters/reorder`, { orders })
export const getCourseAccessList = (courseId) => api.get(`/courses/${courseId}/access`)
export const addCourseAccess = (courseId, userIds) => api.post(`/courses/${courseId}/access`, { user_ids: Array.isArray(userIds) ? userIds : [userIds] })
export const removeCourseAccess = (courseId, userId) => api.delete(`/courses/${courseId}/access/${userId}`)

// ========== Public Course Access ==========
export const getPublicCourse = (id) => api.get(`/public/courses/${id}`)
export const getPublicCourseChapters = (id) => api.get(`/public/courses/${id}/chapters`)
export const getPublicChapter = (courseId, chapterId) => api.get(`/public/courses/${courseId}/chapters/${chapterId}`)
export const unlockCourse = (id, password) => api.post(`/public/courses/${id}/unlock`, { password })

