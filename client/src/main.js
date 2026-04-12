// client/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import './styles/variables.css'
import './styles/utilities.css'
import { initCsrfToken } from './api'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ArcoVue)

app.mount('#app')

// 初始化 CSRF Token
initCsrfToken()

// 标记 Vue 已加载，隐藏骨架屏
document.body.classList.add('vue-loaded')

// 生产环境性能监控 - 延迟加载
if (process.env.NODE_ENV === 'production') {
  setTimeout(() => {
    import('./utils/performance').then(({ performanceMonitor }) => {
      performanceMonitor.init()
    }).catch(() => {})
  }, 1000)
}
