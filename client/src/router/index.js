import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import PaperQuestions from '../views/PaperQuestions.vue'
import Exam from '../views/Exam.vue'
import ExamResult from '../views/ExamResult.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/paper/:id/questions',
    name: 'PaperQuestions',
    component: PaperQuestions
  },
  {
    path: '/exam/:id',
    name: 'Exam',
    component: Exam
  },
  {
    path: '/exam/result/:id',
    name: 'ExamResult',
    component: ExamResult
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true'
  const publicPaths = ['/login', '/exam', '/exam/result']
  const isPublicPath = publicPaths.some(p => to.path === p || to.path.startsWith(p + '/'))

  if (isPublicPath) {
    next()
  } else if (!token && !isLoggedIn) {
    next('/login')
  } else if (isLoggedIn || token) {
    next()
  } else {
    next('/login')
  }
})

export default router
