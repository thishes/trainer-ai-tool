<template>
  <div class="course-view">
    <!-- 密码验证页 -->
    <div v-if="showUnlock" class="unlock-page">
      <div class="unlock-card">
        <div class="unlock-icon">🔒</div>
        <h2>课程需要密码访问</h2>
        <p class="unlock-desc">{{ course?.title || '该课程' }}设置了密码保护</p>
        <a-input-password v-model:value="passwordInput" placeholder="请输入访问密码" size="large" :max-length="20" @pressEnter="doUnlock" />
        <a-button type="primary" size="large" :loading="unlocking" :disabled="!passwordInput" style="width:100%;margin-top:16px;" @click="doUnlock">
          解锁课程
        </a-button>
        <p v-if="unlockError" class="error-text">{{ unlockError }}</p>
      </div>
      <div class="footer">
        <span>© thishe.com</span>
        <span style="margin-left:12px;opacity:0.6;">v{{ APP_VERSION }}</span>
      </div>
      return
    </div>

    <!-- 课程内容 -->
    <template v-if="!showUnlock && course">
      <!-- 顶部封面 -->
      <div class="course-hero" :style="heroStyle">
        <div class="hero-overlay">
          <h1>{{ course.title }}</h1>
          <p v-if="course.description">{{ course.description }}</p>
          <div class="hero-meta">
            <span><IconUser /> {{ course.author_name || '未知作者' }}</span>
            <span><IconEye /> {{ course.view_count || 0 }} 次浏览</span>
            <span>{{ formatTime(course.updated_at) }} 更新</span>
          </div>
        </div>
      </div>

      <div class="course-layout">
        <!-- 左侧目录 -->
        <aside class="course-toc">
          <div class="toc-header">目录</div>
          <nav class="toc-list">
            <a
              v-for="(ch, idx) in flatChapters"
              :key="ch.id"
              class="toc-item"
              :class="{ active: currentChapterId === ch.id }"
              href="#"
              @click.prevent="selectChapter(ch)"
            >
              <span class="toc-num">{{ idx + 1 }}</span>
              <span class="toc-title">{{ ch.title }}</span>
            </a>
          </nav>
          <div v-if="flatChapters.length === 0" class="toc-empty">暂无已发布章节</div>
        </aside>

        <!-- 主内容区 -->
        <main class="course-content">
          <article v-if="currentChapter" class="chapter-article">
            <header class="article-header">
              <h2>{{ currentChapter.title }}</h2>
              <div class="article-nav">
                <a-button
                  text :disabled="prevIdx < 0"
                  @click="selectChapter(flatChapters[prevIdx])"
                >
                  <IconLeft /> 上一篇
                </a-button>
                <span class="nav-pos">{{ currentIdx + 1 }} / {{ flatChapters.length }}</span>
                <a-button
                  text :disabled="nextIdx >= flatChapters.length"
                  @click="selectChapter(flatChapters[nextIdx])"
                >
                  下一篇 <IconRight />
                </a-button>
              </div>
            </header>
            <div class="article-body">
              <SafeHtml :html="chapterContentHtml" />
            </div>
          </article>
          <div v-else class="no-chapter">
            <a-empty description="请从左侧目录选择要阅读的章节" />
          </div>
        </main>
      </div>

      <div class="footer">
        <span>© thishe.com</span>
        <span style="margin-left:12px;opacity:0.6;">v{{ APP_VERSION }}</span>
      </div>
    </template>

    <!-- 加载中 -->
    <div v-if="loading && !course" class="loading-page"><a-spin size="large" /></div>

    <!-- 错误状态 -->
    <div v-if="error && !course && !showUnlock" class="error-page">
      <a-result status="404" title="课程不存在或未发布" subtitle="您访问的课程可能已被删除、下架或链接有误">
        <template #extra>
          <a-button type="primary" @click="$router.push('/')">返回首页</a-button>
        </template>
      </a-result>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconUser, IconEye, IconLeft, IconRight } from '@arco-design/web-vue/es/icon'
import SafeHtml from '@/components/SafeHtml.vue'
import { APP_VERSION } from '@/version'
import { getPublicCourse, getPublicCourseChapters, unlockCourse as unlockApi } from '@/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(false)
const course = ref(null)
const chapters = ref([])
const currentChapterId = ref(null)
const showUnlock = ref(false)
const passwordInput = ref('')
const unlocking = ref(false)
const unlockError = ref('')

function flattenTree(nodes) {
  const result = []
  for (const n of nodes) {
    result.push(n)
    if (n.children?.length) result.push(...flattenTree(n.children))
  }
  return result
}

const flatChapters = computed(() => flattenTree(chapters.value))
const currentChapter = computed(() => flatChapters.value.find(c => c.id === currentChapterId.value))
const currentIdx = computed(() => flatChapters.value.findIndex(c => c.id === currentChapterId.value))
const prevIdx = computed(() => currentIdx.value - 1)
const nextIdx = computed(() => currentIdx.value + 1)

const heroStyle = computed(() => {
  if (!course.value) return {}
  if (course.value.cover_image || course.value.cover_url) {
    return { background: `url(${course.value.cover_url || course.value.cover_image}) center/cover no-repeat` }
  }
  return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
})

const chapterContentHtml = computed(() => {
  return currentChapter.value?.content || '<p style="color:var(--text-secondary)">（章节内容为空）</p>'
})

onMounted(async () => {
  await loadCourse()
})

async function loadCourse() {
  loading.value = true
  error.value = false
  try {
    const res = await getPublicCourse(route.params.id)
    if (res.data?.success) {
      const data = res.data.data
      if (data.visibility === 'password') {
        course.value = data
        chapters.value = data.chapters || []
        showUnlock.value = true
        checkSessionUnlock(data.id)
      } else {
        course.value = data
        chapters.value = data.chapters || []
        if (flatChapters.value.length > 0) selectChapter(flatChapters.value[0])
      }
    } else {
      error.value = true
    }
  } catch(e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

function checkSessionUnlock(courseId) {
  try {
    const unlocked = sessionStorage.getItem(`course_unlock_${courseId}`)
    if (unlocked === '1') showUnlock.value = false
  } catch(e) {}
}

async function doUnlock() {
  if (!passwordInput.value) return
  unlocking.value = true
  unlockError.value = ''
  try {
    const res = await unlockApi(route.params.id, passwordInput.value)
    if (res.data?.success && res.data.data?.unlocked) {
      sessionStorage.setItem(`course_unlock_${route.params.id}`, '1')
      showUnlock.value = false
      Message.success('解锁成功')
    } else {
      unlockError.value = res.data?.message || '密码错误'
    }
  } catch(e) {
    unlockError.value = e.response?.data?.message || '密码错误，请重试'
  } finally {
    unlocking.value = false
  }
}

function selectChapter(ch) {
  currentChapterId.value = ch.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.course-view { min-height: 100vh; display: flex; flex-direction: column; background: #f7f8fa; }

/* 密码验证 */
.unlock-page { display: flex; align-items: center; justify-content: center; flex: 1; padding: 20px; }
.unlock-card { background: #fff; border-radius: 16px; padding: 48px 36px; width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.08); text-align: center; }
.unlock-icon { font-size: 48px; margin-bottom: 16px; }
.unlock-card h2 { margin: 0 0 8px; font-size: 20px; }
.unlock-desc { color: var(--text-secondary, #86909c); margin-bottom: 24px; }
.error-text { color: rgb(var(--danger-6)); margin-top: 12px; font-size: 13px; }

/* 封面 */
.course-hero { height: 260px; position: relative; overflow: hidden; }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 32px 40px; color: #fff; }
.hero-overlay h1 { margin: 0 0 10px; font-size: 28px; font-weight: 700; }
.hero-overlay p { margin: 0 0 14px; opacity: 0.9; max-width: 600px; line-height: 1.5; }
.hero-meta { display: flex; gap: 20px; font-size: 13px; opacity: 0.85; }
.hero-meta span { display: flex; align-items: center; gap: 4px; }

/* 布局 */
.course-layout { display: flex; max-width: 1200px; width: 100%; margin: 0 auto; gap: 0; flex: 1; }

/* 目录 */
.course-toc { width: 240px; min-width: 200px; background: #fff; border-right: 1px solid var(--border-color-light, #e5e6eb); height: calc(100vh - 340px); position: sticky; top: 0; overflow-y: auto; flex-shrink: 0; }
.toc-header { padding: 14px 18px; font-weight: 600; font-size: 15px; border-bottom: 1px solid var(--border-color-light, #e5e6eb); }
.toc-list { padding: 8px 0; }
.toc-item { display: flex; align-items: center; padding: 9px 18px; cursor: pointer; transition: all 0.15s; color: var(--text-1, #1d2129); font-size: 13.5px; text-decoration: none; border-left: 3px solid transparent; }
.toc-item:hover { background: rgba(var(--primary-6), 0.04); }
.toc-item.active { background: rgba(var(--primary-6), 0.08); border-left-color: var(--primary-6); color: var(--primary-6); font-weight: 500; }
.toc-num { color: var(--text-3, #86909c); margin-right: 8px; font-size: 12px; min-width: 18px; }
.toc-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toc-empty { text-align: center; padding: 30px 16px; color: var(--text-3, #86909c); font-size: 13px; }

/* 内容区 */
.course-content { flex: 1; background: #fff; padding: 28px 40px; min-width: 0; overflow-y: auto; }
.article-header { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color-light, #e5e6eb); }
.article-header h2 { margin: 0 0 12px; font-size: 22px; font-weight: 700; }
.article-nav { display: flex; justify-content: space-between; align-items: center; }
.nav-pos { font-size: 13px; color: var(--text-3, #86909c); }
.article-body { line-height: 1.8; color: var(--text-1, #1d2129); font-size: 15px; }
.article-body :deep(img) { max-width: 100%; border-radius: 6px; }
.article-body :deep(pre) { background: #f2f3f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
.no-chapter { display: flex; align-items: center; justify-content: center; min-height: 300px; }

/* 页脚 */
.footer { text-align: center; padding: 20px 16px; color: var(--text-secondary, #86909c); font-size: 13px; border-top: 1px solid var(--border-color-light, #e5e6eb); margin-top: auto; }

/* 加载/错误 */
.loading-page { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 400px; }
.error-page { display: flex; align-items: center; justify-content: center; flex: 1; padding: 60px 20px; }

/* 响应式 */
@media (max-width: 768px) {
  .course-layout { flex-direction: column; }
  .course-toc { width: 100%; height: auto; max-height: 250px; position: relative; }
  .course-content { padding: 16px 20px; }
  .hero-overlay { padding: 20px; }
  .hero-overlay h1 { font-size: 22px; }
}
</style>
