import axios from 'axios'

// 使用相对路径，依赖服务端代理
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 认证
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const getUserInfo = () => api.get('/auth/me')

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
export const getExamRecords = (paperId) => api.get(`/exam/records/${paperId}`)
export const getExamStats = (paperId) => api.get(`/exam/stats/${paperId}`)

export default api

// 用户管理
export const getUsers = (params) => api.get('/users', { params })
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const lockUser = (id, status) => api.patch(`/users/${id}/status`, { status })
export const deleteUser = (id) => api.delete(`/users/${id}`)
