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
    </div>

    <!-- 课程内容 -->
    <template v-if="!showUnlock && course">
      <!-- 【T1.5】移动端目录切换按钮 -->
      <div class="mobile-toc-toggle" @click="toggleMobileToc">
        <IconMenu />
        <span>目录</span>
      </div>

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

      <!-- 【T2.2】学习进度追踪条（仅在有进度数据或加载中时显示） -->
      <ProgressTracker
        v-if="course?.id"
        ref="progressTrackerRef"
        :course-id="course.id"
        :auto-load="true"
        :show-when-empty="false"
        @continue="handleContinueLearning"
      />

      <div class="course-layout">
        <!-- 【T1.5】移动端遮罩层（点击关闭目录） -->
        <div v-if="showMobileToc" class="toc-overlay" @click="toggleMobileToc"></div>

        <!-- 左侧目录（桌面端固定 + 移动端抽屉） -->
        <aside class="course-toc" :class="{ 'mobile-active': showMobileToc }">
          <div class="toc-header">
            <span>目录</span>
            <!-- 【T1.5】移动端关闭按钮 -->
            <IconClose v-if="showMobileToc" class="toc-close-btn" @click="toggleMobileToc" />
          </div>
          <nav class="toc-list">
            <a
              v-for="(ch, idx) in flatChapters"
              :key="ch.id"
              class="toc-item"
              :class="[`toc-depth-${ch._depth}`, { active: currentChapterId === ch.id }]"
              href="#"
              @click.prevent="selectChapter(ch)"
            >
              <span class="toc-num">{{ ch._num }}</span>
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
    <div v-if="loading && !course" class="loading-page"><a-spin :size="36" /></div>

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { IconUser, IconEye, IconLeft, IconRight, IconMenu, IconClose } from '@arco-design/web-vue/es/icon'
import SafeHtml from '@/components/SafeHtml.vue'
import ProgressTracker from '@/components/ProgressTracker.vue'
import { APP_VERSION } from '@/version'
import { getPublicCourse, getPublicCourseChapters, unlockCourse as unlockApi, saveLearningProgress } from '@/api'

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

// 【T1.5】移动端目录状态
const showMobileToc = ref(false)

// 【T2.2】学习进度追踪
let progressSaveTimer = null;
const PROGRESS_SAVE_INTERVAL = 30000; // 30秒自动保存

function startProgressAutoSave() {
  if (progressSaveTimer) clearInterval(progressSaveTimer);
  progressSaveTimer = setInterval(() => {
    if (course.value && currentChapterId.value) saveReadingProgress();
  }, PROGRESS_SAVE_INTERVAL);
}

function stopProgressAutoSave() {
  if (progressSaveTimer) { clearInterval(progressSaveTimer); progressSaveTimer = null; }
  saveReadingProgress(); // 离开时保存一次
}

async function saveReadingProgress() {
  try {
    const totalChapters = chapters.value?.length || 0;
    const currentIdx = chapters.value.findIndex(ch => ch.id === currentChapterId.value);
    const percent = totalChapters > 0 ? Math.round(((currentIdx + 1) / totalChapters) * 100) : 0;

    await saveLearningProgress({
      course_id: course.value?.id,
      chapter_id: currentChapterId.value,
      progress_percent: percent,
      last_position: { scrollY: window.scrollY || 0, timestamp: Date.now() }
    });
  } catch(e) { console.warn('[PROGRESS] 自动保存失败:', e.message); }
}

function handleContinueLearning(progressData) {
  if (progressData?.chapter_id && progressData?.last_chapter_title) {
    selectChapter({ id: progressData.chapter_id, title: progressData.last_chapter_title });
    Message.success(`继续学习：${progressData.last_chapter_title}`);
  }
}

// 【T1.5】切换移动端目录显示/隐藏
function toggleMobileToc() {
  showMobileToc.value = !showMobileToc.value
  // 防止背景滚动
  if (showMobileToc.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

function flattenTree(nodes, depth = 0, parentNum = '') {
  const result = []
  let siblingIdx = 0
  for (const n of nodes) {
    siblingIdx++
    const num = depth === 0 ? String(siblingIdx) : parentNum + '.' + siblingIdx
    result.push({ ...n, _depth: depth, _num: num })
    if (n.children?.length) {
      result.push(...flattenTree(n.children, depth + 1, num))
    }
  }
  return result
}
const flatChapters = computed(() => flattenTree(chapters.value))
const currentChapter = computed(() => flatChapters.value.find(c => c.id === currentChapterId.value))
const currentIdx = computed(() => flatChapters.value.findIndex(c => c.id === currentChapterId.value))
const prevIdx = computed(() => currentIdx.value - 1)
const nextIdx = computed(() => currentIdx.value + 1)

function resolveCoverUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return window.location.origin + url
}

const heroStyle = computed(() => {
  if (!course.value) return {}
  const coverUrl = course.value.cover_url || course.value.cover_image
  console.log('[CourseView] heroStyle 计算:', {
    courseId: course.value.id,
    cover_url: course.value.cover_url,
    cover_image: course.value.cover_image,
    coverUrl: coverUrl,
    resolvedUrl: coverUrl ? resolveCoverUrl(coverUrl) : '(无封面)'
  })
  if (coverUrl) {
    return { background: `url(${resolveCoverUrl(coverUrl)}) center/cover no-repeat` }
  }
  return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
})

const chapterContentHtml = computed(() => {
  return currentChapter.value?.content || '<p style="color:var(--text-secondary)">（章节内容为空）</p>'
})

onMounted(async () => {
  await loadCourse()
  // 【T2.2】课程加载后启动进度自动保存
  if (course.value) startProgressAutoSave()
})

onUnmounted(() => {
  // 【T2.2】离开页面时停止自动保存并记录最后位置
  stopProgressAutoSave()
  if (showMobileToc.value) document.body.style.overflow = '' // 清理移动端样式
})

async function loadCourse() {
  loading.value = true
  error.value = false
  try {
    const res = await getPublicCourse(route.params.id)
    if (res.success) {
      const data = res.data
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
    if (res.success && res.data?.unlocked) {
      sessionStorage.setItem(`course_unlock_${route.params.id}`, '1')
      showUnlock.value = false
      Message.success('解锁成功')
    } else {
      unlockError.value = res.message || '密码错误'
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
.course-layout { display: flex; max-width: 1200px; width: 100%; margin: 0 auto; gap: 0; flex: 1; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }

/* 目录 */
.course-toc { width: 220px; min-width: 200px; background: #fafbfc; height: calc(100vh - 340px); position: sticky; top: 0; overflow-y: auto; flex-shrink: 0; padding: 20px 0 20px 20px; }
.toc-depth-1 { padding-left: 16px; }
.toc-depth-2 { padding-left: 32px; }
.toc-depth-3 { padding-left: 48px; }

.toc-header { padding: 10px 16px; font-weight: 500; font-size: 13px; color: var(--text-3, #86909c); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.toc-list { padding: 4px 0; }
.toc-item { display: flex; align-items: center; padding: 8px 16px; cursor: pointer; transition: all 0.2s ease; color: var(--text-2, #4e5969); font-size: 13px; text-decoration: none; border-radius: 8px; margin: 2px 8px; }
.toc-item:hover { background: rgba(0, 0, 0, 0.04); color: var(--text-1, #1d2129); }
.toc-item.active { background: rgba(var(--primary-6), 0.08); color: var(--primary-6); font-weight: 500; }
.toc-num { color: var(--text-4, #c9cdd4); margin-right: 6px; font-size: 11px; min-width: 16px; }
.toc-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toc-empty { text-align: center; padding: 24px 16px; color: var(--text-4, #c9cdd4); font-size: 12px; }

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

/* 移动端目录按钮 - PC端默认隐藏 */
.mobile-toc-toggle { display: none; }

/* 响应式 - 【T1.5】移动端抽屉式目录 */
@media (max-width: 767.98px) {
  .course-layout {
    flex-direction: column;
    position: relative;
  }

  /* 【T1.5】移动端目录切换按钮 */
  .mobile-toc-toggle {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1, #1d2129);
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
  }
  .mobile-toc-toggle:active {
    transform: scale(0.95);
  }

  /* 【T1.5】遮罩层 */
  .toc-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1001;
    animation: fadeIn 0.3s ease;
  }

  /* 【T1.5】抽屉式目录 */
  .course-toc {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 85vw;
    height: 100vh;
    z-index: 1002;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 2px 0 24px rgba(0, 0, 0, 0.15);
    background: #fff;
  }
  .course-toc.mobile-active {
    transform: translateX(0);
  }

  /* 【T1.5】关闭按钮 */
  .toc-close-btn {
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    transition: background 0.2s;
  }
  .toc-close-btn:hover {
    background: var(--color-fill-2, #f2f3f5);
  }

  /* 【T1.5】触摸友好的目录项 */
  .toc-item {
    min-height: 48px; /* Apple HIG标准：最小44pt触摸区域 */
    display: flex;
    align-items: center;
    padding: 12px 18px;
    font-size: 14px; /* 稍大字体提升可读性 */
  }

  /* 内容区全宽显示 */
  .course-content {
    width: 100%;
    padding: 16px;
    margin-top: 48px; /* 为固定按钮留出空间 */
  }

  /* 封面高度适配 */
  .course-hero { height: 200px; }
  .hero-overlay { padding: 20px; }
  .hero-overlay h1 { font-size: 22px; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 【T2.2】进度条容器 */
.progress-bar-wrapper {
  max-width: 960px;
  margin: -16px auto 0;
  position: relative;
  z-index: 10;
}
@media screen and (max-width: 767.98px) {
  .progress-bar-wrapper {
    margin: -8px 12px 0;
    padding: 0;
  }
}
</style>
