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
const PromotionView = () => import('../views/PromotionView.vue')
const PromotionPublic = () => import('../views/PromotionPublic.vue')
const PromotionSignupQuery = () => import('../views/promotion/PromotionSignupQuery.vue')

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
      title: '考试结果'
    }
  },
  {
    path: '/promotions',
    redirect: '/dashboard'
  },
  {
    path: '/promotions/new',
    redirect: '/dashboard'
  },
  {
    path: '/promotions/:id/edit',
    redirect: '/dashboard'
  },
  {
    path: '/prom/p/:id',
    name: 'PromotionView',
    component: PromotionView,
    meta: {
      title: '宣传页面'
    }
  },
  {
    path: '/promotion/:id',
    name: 'PromotionPublic',
    component: PromotionPublic,
    meta: {
      title: '文案详情'
    }
  },
  {
    path: '/promotion/:id/query',
    name: 'PromotionSignupQuery',
    component: PromotionSignupQuery,
    meta: {
      title: '报名查询'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  NProgress.start()
  document.title = to.meta.title ? `${to.meta.title} - 培训师小助手` : '培训师小助手'

  const loggedIn = localStorage.getItem('loggedIn') === 'true'

  if (to.meta.requiresAuth) {
    if (!loggedIn) {
      next('/login')
    } else {
      // 验证 token 有效性（通过服务端验证）
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!res.ok) {
          localStorage.removeItem('user')
          localStorage.removeItem('loggedIn')
          next('/login')
          return
        }
      } catch (e) {
        // 网络错误时不阻断，允许后续 API 请求失败时再处理
      }
      next()
    }
  } else if (to.path === '/login' && loggedIn) {
    // 已登录用户访问登录页，验证 token 后重定向
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        next('/dashboard')
        return
      }
    } catch (e) { /* ignore */ }
    localStorage.removeItem('user')
    localStorage.removeItem('loggedIn')
    next()
  } else {
    next()
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
