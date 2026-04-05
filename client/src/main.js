// client/src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import './styles/variables.css'

const app = createApp(App)

app.use(router)
app.use(ElementPlus)
app.use(ArcoVue)

app.mount('#app')

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
