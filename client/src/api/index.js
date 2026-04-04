import axios from 'axios'

// 使用相对路径，依赖服务端代理
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 
    'Content-Type': 'application/json',
    // 显式允许携带 credentials
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true // 允许携带 Cookie
})

// 请求拦截器 - 优先从 Cookie 获取 token，同时支持 localStorage 后备
api.interceptors.request.use(config => {
  // Cookie 中的 token 会被自动发送
  // 如果需要显式发送 localStorage 的 token（用于非 Cookie 场景）
  const localToken = localStorage.getItem('token')
  if (localToken) {
    config.headers.Authorization = `Bearer ${localToken}`
  }
  return config
})

// 响应拦截器 - 改进错误处理
api.interceptors.response.use(
  response => response.data,
  error => {
    const status = error.response?.status
    const message = error.response?.data?.message
    
    // 统一错误提示
    let errorMsg = message || '网络错误，请稍后重试'
    
    switch (status) {
      case 400:
        errorMsg = message || '请求参数错误'
        break
      case 401:
        const wasLoggedIn = localStorage.getItem('loggedIn') === 'true'
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('loggedIn')
        errorMsg = message || '登录已过期，请重新登录'
        if (!window.location.pathname.includes('/login') && wasLoggedIn) {
          setTimeout(() => {
            window.location.href = '/login'
          }, 500)
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
    
    // 返回带有错误信息的 Promise
    return Promise.reject(new Error(errorMsg))
  }
)

// 认证
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const getCaptcha = () => api.get('/auth/captcha')
export const getUserInfo = () => api.get('/auth/me')
export const logout = () => api.post('/auth/logout')
export const refreshToken = () => api.post('/auth/refresh')

// 题目
export const getQuestions = (params) => api.get('/questions', { params })
export const getQuestion = (id) => api.get(`/questions/${id}`)
export const createQuestion = (data) => api.post('/questions', data)
export const updateQuestion = (id, data) => api.put(`/questions/${id}`, data)
export const deleteQuestion = (id) => api.delete(`/questions/${id}`)
export const importQuestions = (data) => api.post('/questions/import', data)

// 分类
export const getCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

// 试卷
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
export const getPaperQuestions = (paperId) => api.get(`/papers/${paperId}/manage-questions`)
export const addQuestionsToPaper = (paperId, questionIds) => api.post(`/papers/${paperId}/questions/add`, { question_ids: questionIds })
export const removeQuestionFromPaper = (paperId, questionId) => api.delete(`/papers/${paperId}/questions/${questionId}`)

// 考试
export const startExamApi = (data) => api.post('/exam/start', data)
export const getExamQuestions = (examId) => api.get(`/exam/${examId}/questions`)
export const saveProgress = (data) => api.post('/exam/save-progress', data)
export const submitExam = (data) => api.post('/exam/submit', data)
export const getExamResult = (examId) => api.get(`/exam/${examId}/result`)
export const getExamRecords = (paperId, params) => api.get(`/exam/records/${paperId}`, { params })
export const getExamStats = (paperId) => api.get(`/exam/stats/${paperId}`)
export const getPendingGrading = (paperId, params) => api.get(`/exam/pending-grading/${paperId}`, { params })
export const gradeEssay = (data) => api.post('/exam/grade-essay', data)

// 公告
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

// 考生管理
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
  const token = localStorage.getItem('token')
  return fetch(`${baseURL}/api/students/paper/${paperId}/export`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
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

// 升级管理
export const checkUpgrade = () => api.get('/upgrade/check')
export const doUpgrade = (version) => api.post('/upgrade/upgrade', { version })

// 用户管理
export const getUsers = (params) => api.get('/users', { params })
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const lockUser = (id, status) => api.patch(`/users/${id}/status`, { status })
export const deleteUser = (id) => api.delete(`/users/${id}`)
export const changePassword = (data) => api.post('/users/change-password', data)