import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })

// 路由懒加载 - 减少初始包体积
const Login = () => import('../views/Login.vue')
const Dashboard = () => import('../views/Dashboard.vue')
const Profile = () => import('../views/Profile.vue')
const PaperQuestions = () => import('../views/PaperQuestions.vue')
const Exam = () => import('../views/Exam.vue')
const ExamResult = () => import('../views/ExamResult.vue')

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录'
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { 
      requiresAuth: true,
      title: '个人中心'
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { 
      requiresAuth: true,
      title: '仪表板'
    }
  },
  {
    path: '/paper/:id/questions',
    name: 'PaperQuestions',
    component: PaperQuestions,
    meta: {
      title: '组卷'
    }
  },
  {
    path: '/exam/:id',
    name: 'Exam',
    component: Exam,
    meta: {
      title: '考试'
    }
  },
  {
    path: '/exam/result/:id',
    name: 'ExamResult',
    component: ExamResult,
    meta: {
      title: '考试结果',
      requiresAuth: true
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    // 自定义滚动行为
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由级别进度条（可选）
let progressBar = null

router.beforeEach((to, _from, next) => {
  NProgress.start()
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 培训师 AI 工具`
  }
  
  const token = localStorage.getItem('token')
  const loggedIn = localStorage.getItem('loggedIn')
  
  if (to.meta.requiresAuth) {
    // 需要认证的路由
    if (!token || !loggedIn) {
      // 没有 token 或未登录，跳转到登录页
      next('/login')
    } else {
      // 检查 token 是否过期
      try {
        // 使用更健壮的 base64 解码，处理可能的格式错误
        const base64Url = token.split('.')[1]
        if (!base64Url) {
          throw new Error('Token 格式无效')
        }
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        // 使用现代方法解码 base64
        const jsonPayload = window.atob(base64)
        const payload = JSON.parse(jsonPayload)
        const now = Date.now() / 1000
        if (payload.exp && payload.exp < now) {
          // token 已过期
          localStorage.removeItem('token')
          localStorage.removeItem('loggedIn')
          localStorage.removeItem('user')
          next('/login')
          return
        }
      } catch (e) {
        // token 格式无效或解析失败
        console.warn('Token 验证失败:', e.message)
        localStorage.removeItem('token')
        localStorage.removeItem('loggedIn')
        localStorage.removeItem('user')
        next('/login')
        return
      }
      
      // token 和登录状态都存在且有效，允许访问
      // 注意：token 的有效性验证由 API 拦截器处理，如果 token 无效，
      // API 请求会返回 401，届时会清除本地存储并重定向到登录页
      NProgress.done()
      next()
    }
  } else if (to.path === '/login' && token && loggedIn) {
    // 已登录用户访问登录页，重定向到仪表板
    NProgress.done()
    next('/dashboard')
  } else {
    // 其他情况直接访问
    NProgress.done()
    next()
  }
})

// 路由加载错误处理
router.onError((error, to) => {
  NProgress.done()
  console.error('路由加载错误:', error)
  console.error('目标路由:', to.path)

  if (error.name === 'ChunkLoadError') {
    console.warn('代码块加载失败，可能是新版本已部署，正在重新加载...')
    window.location.reload()
  }
})

router.afterEach((to) => {
  const preloadRoutes = ['/dashboard', '/profile', '/paper']
  preloadRoutes.forEach(path => {
    if (to.path.startsWith(path)) return
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = path
    document.head.appendChild(link)
  })
})

export default router
