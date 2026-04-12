<template>
  <div class="dashboard toutiao-layout">
    <div class="sidebar-overlay" :class="{ 'mobile-visible': sidebarOpen }" @click="sidebarOpen = false"></div>
    <aside class="sidebar" :class="{ 'mobile-open': sidebarOpen }">
      <div class="sidebar-brand">
        <div class="logo-icon">
          <img src="/logo.png" alt="logo" style="width: 28px; height: 28px; object-fit: contain;" />
        </div>
        <span class="brand-text">培训师小助手</span>
      </div>
      <nav class="sidebar-nav" role="tablist" aria-label="管理面板导航">
        <div class="nav-group">
          <div class="nav-group-title">考试服务</div>
          <div class="nav-item" :class="{ active: activeTab === 'questions' }" role="tab" :tabindex="activeTab === 'questions' ? 0 : -1" :aria-selected="activeTab === 'questions'" @click="switchTab('questions')" @keydown.enter="switchTab('questions')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            <span>题库管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'papers' }" role="tab" :tabindex="activeTab === 'papers' ? 0 : -1" :aria-selected="activeTab === 'papers'" @click="switchTab('papers')" @keydown.enter="switchTab('papers')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>试卷管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'screen' }" role="tab" :tabindex="activeTab === 'screen' ? 0 : -1" :aria-selected="activeTab === 'screen'" @click="switchTab('screen')" @keydown.enter="switchTab('screen')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>考试数据</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'grading' }" role="tab" :tabindex="activeTab === 'grading' ? 0 : -1" :aria-selected="activeTab === 'grading'" @click="switchTab('grading')" @keydown.enter="switchTab('grading')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>待评分</span>
            <span v-if="pendingGradingCount > 0" class="badge">{{ pendingGradingCount }}</span>
          </div>
        </div>
        <div class="nav-group">
          <div class="nav-group-title">宣推服务</div>
          <div class="nav-item" :class="{ active: activeTab === 'promotions' }" role="tab" :tabindex="activeTab === 'promotions' ? 0 : -1" :aria-selected="activeTab === 'promotions'" @click="switchTab('promotions')" @keydown.enter="switchTab('promotions')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>海报与报名</span>
          </div>
        </div>
        <div v-if="user?.role === 'admin'" class="nav-group">
          <div class="nav-group-title">系统管理</div>
          <div class="nav-item" :class="{ active: activeTab === 'users' }" role="tab" :tabindex="activeTab === 'users' ? 0 : -1" :aria-selected="activeTab === 'users'" @click="switchTab('users')" @keydown.enter="switchTab('users')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>用户管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'announcements' }" role="tab" :tabindex="activeTab === 'announcements' ? 0 : -1" :aria-selected="activeTab === 'announcements'" @click="switchTab('announcements')" @keydown.enter="switchTab('announcements')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>公告管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'system' }" role="tab" :tabindex="activeTab === 'system' ? 0 : -1" :aria-selected="activeTab === 'system'" @click="switchTab('system')" @keydown.enter="switchTab('system')" @keydown.right="focusNextTab" @keydown.left="focusPrevTab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>系统设置</span>
          </div>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="user-card" @click="$router.push('/profile')" style="cursor: pointer;">
          <a-avatar :size="36" :style="{ backgroundColor: getAvatarColor() }">
            {{ user?.username?.charAt(0).toUpperCase() }}
          </a-avatar>
          <div class="user-info">
            <div class="user-name">{{ user?.username }}</div>
            <div class="user-role">{{ user?.role === 'admin' ? '管理员' : '培训师' }}</div>
          </div>
        </div>
        <a-button type="text" size="small" @click="logout" class="logout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </a-button>
      </div>
    </aside>

    <div class="mobile-header hide-md hide-lg hide-xl">
      <button class="hamburger-btn" @click="sidebarOpen = !sidebarOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span class="brand-text">培训师小助手</span>
    </div>

    <main class="main-content">
      <div v-if="activatedTabs.questions" v-show="activeTab === 'questions'" class="page-view">
        <QuestionsPanel ref="questionsPanelRef" @questionsUpdated="onQuestionsUpdated" />
      </div>

      <div v-if="activatedTabs.papers" v-show="activeTab === 'papers'" class="page-view">
        <PapersPanel ref="papersPanelRef" :papersWithPendingGrading="gradingPanelRef?.papersWithPendingGrading" :categories="questionsPanelRef?.categories || []" @goToGrading="goToGrading" @papersUpdated="onPapersUpdated" />
      </div>

      <div v-if="activatedTabs.screen" v-show="activeTab === 'screen'" class="page-view">
        <ExamStatsPanel ref="examStatsPanelRef" :publishedPapers="publishedPapers" />
      </div>

      <div v-if="user?.role === 'admin' && activatedTabs.users" v-show="activeTab === 'users'" class="page-view">
        <UsersPanel />
      </div>

      <div v-if="user?.role === 'admin' && activatedTabs.announcements" v-show="activeTab === 'announcements'" class="page-view">
        <AnnouncementsPanel />
      </div>

      <!-- 待评分页面 - 使用 GradingPanel 子组件 -->
      <div v-if="activatedTabs.grading" v-show="activeTab === 'grading'" class="page-view">
        <GradingPanel ref="gradingPanelRef" @graded="onGraded" />
      </div>

      <div v-if="user?.role === 'admin' && activatedTabs.system" v-show="activeTab === 'system'">
        <SystemSettings />
      </div>

      <div v-if="activatedTabs.promotions" v-show="activeTab === 'promotions'">
        <PromotionsPanel :is-admin="user?.role === 'admin'" />
      </div>
    </main>

    <div class="footer">
      <span>© thishe.com</span>
      <a-tag size="small" color="arcoblue">v{{ currentVersion }}</a-tag>
    </div>


  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { checkUpgrade, doUpgrade, getPapers, logout } from '@/api'
import { formatDateTime } from '@/utils/date'
import { APP_VERSION } from '@/version'
import { useUserStore } from '@/stores/user'
import { useSocket, disconnectSocket } from '@/composables/useSocket'
import SystemSettings from './SystemSettings.vue'
import PromotionsPanel from './PromotionsPanel.vue'
import GradingPanel from '@/views/GradingPanel.vue'
import UsersPanel from '@/views/UsersPanel.vue'
import AnnouncementsPanel from '@/views/AnnouncementsPanel.vue'
import QuestionsPanel from '@/views/QuestionsPanel.vue'
import PapersPanel from '@/views/PapersPanel.vue'
import ExamStatsPanel from '@/views/ExamStatsPanel.vue'

export default {
  name: 'Dashboard',
  components: { SystemSettings, PromotionsPanel, GradingPanel, UsersPanel, AnnouncementsPanel, QuestionsPanel, PapersPanel, ExamStatsPanel },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const userStore = useUserStore()
    const user = computed(() => userStore.user || {})
    // 从 URL hash 初始化 activeTab，默认 'questions'
    const validTabs = ['questions', 'papers', 'screen', 'grading', 'promotions', 'users', 'announcements', 'system']
    const initialTab = route.hash.slice(1)
    const activeTab = ref(validTabs.includes(initialTab) ? initialTab : 'questions')
    // 懒加载：首次切换到某 Tab 才渲染其组件
    const activatedTabs = reactive({ [activeTab.value]: true })
    const sidebarOpen = ref(false)
    const currentVersion = ref(APP_VERSION)
    const upgradeInfo = ref({})
    const checkingUpgrade = ref(false)
    const upgrading = ref(false)
    const upgradeMessage = ref('')
    const upgradeSuccess = ref(false)

    const checkForUpgrade = async () => {
      checkingUpgrade.value = true
      upgradeMessage.value = ''
      try {
        const res = await checkUpgrade()
        upgradeInfo.value = res.data || {}
        if (!upgradeInfo.value.hasUpdate) {
          upgradeMessage.value = '当前已是最新版本'
          upgradeSuccess.value = true
        }
      } catch (e) {
        upgradeMessage.value = '检查更新失败'
        upgradeSuccess.value = false
      }
      checkingUpgrade.value = false
    }

    const performUpgrade = async () => {
      if (!upgradeInfo.value.hasUpdate) return
      Modal.confirm({
        title: '确认升级',
        content: `确定要升级到 v${upgradeInfo.value.latestVersion} 吗？升级后版本信息将更新。`,
        onOk: async () => {
          upgrading.value = true
          upgradeMessage.value = ''
          try {
            await doUpgrade(upgradeInfo.value.latestVersion)
            upgradeMessage.value = '升级成功，请刷新页面'
            upgradeSuccess.value = true
            currentVersion.value = upgradeInfo.value.latestVersion
          } catch (e) {
            upgradeMessage.value = '升级失败'
            upgradeSuccess.value = false
          }
          upgrading.value = false
        }
      })
    }

    const switchTab = (tab) => {
      activeTab.value = tab
      activatedTabs[tab] = true  // 首次激活后不再销毁
      sidebarOpen.value = false
      // 同步 URL hash，不触发导航
      router.replace({ hash: `#${tab}` }).catch(() => {})
    }

    // 键盘导航：左右箭头切换 Tab
    const focusNextTab = () => {
      const visibleTabs = validTabs.filter(t => t === 'promotions' || t === 'grading' || t === 'screen' || t === 'questions' || t === 'papers' || (user.value?.role === 'admin' && (t === 'users' || t === 'announcements' || t === 'system')))
      const idx = visibleTabs.indexOf(activeTab.value)
      const next = visibleTabs[(idx + 1) % visibleTabs.length]
      switchTab(next)
    }

    const focusPrevTab = () => {
      const visibleTabs = validTabs.filter(t => t === 'promotions' || t === 'grading' || t === 'screen' || t === 'questions' || t === 'papers' || (user.value?.role === 'admin' && (t === 'users' || t === 'announcements' || t === 'system')))
      const idx = visibleTabs.indexOf(activeTab.value)
      const prev = visibleTabs[(idx - 1 + visibleTabs.length) % visibleTabs.length]
      switchTab(prev)
    }

    // 监听 activeTab 变化同步 hash（初始化时也写入）
    watch(activeTab, (tab) => {
      if (route.hash.slice(1) !== tab) {
        router.replace({ hash: `#${tab}` }).catch(() => {})
      }
    }, { immediate: true })

    // 监听浏览器前进/后退
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (validTabs.includes(hash) && hash !== activeTab.value) {
        activeTab.value = hash
      }
    }

    // 子组件 refs
    const gradingPanelRef = ref(null)
    const questionsPanelRef = ref(null)
    const papersPanelRef = ref(null)
    const examStatsPanelRef = ref(null)
    const pendingGradingCount = computed(() => gradingPanelRef.value?.pendingGradingCount || 0)
    const publishedPapers = ref([])

    const onGraded = () => {
      // 评分完成后刷新相关数据
    }

    const onQuestionsUpdated = () => {
      // 题目更新时可以刷新相关数据
    }

    const onPapersUpdated = async () => {
      // 试卷更新时刷新发布试卷列表
      try {
        const res = await getPapers({ pageSize: 100 })
        if (res.data) {
          const paperList = res.data.list || res.data.papers || []
          publishedPapers.value = paperList.filter(p => p.status === 'published')
        }
      } catch (e) { console.error(e) }
    }

    const goToGrading = (paperId) => {
      activeTab.value = 'grading'
      nextTick(() => {
        gradingPanelRef.value?.scrollToPaper(paperId)
      })
    }

    // Socket.io 实时更新（使用单例连接）
    const initSocket = () => {
      const socket = useSocket()

      socket.on('pending-essay-grade', (data) => {
        if (gradingPanelRef.value) {
          gradingPanelRef.value.loadPendingGrading()
        }
        Message.info(`收到待评分通知: ${data.student_name} 提交了 ${data.essay_count} 道问答题`)
      })
    }


    const handleLogout = () => {
      Modal.confirm({
        title: '退出确认',
        content: '确定要退出登录吗?',
        okText: '确定退出',
        cancelText: '取消',
        onOk: async () => {
          await userStore.logout()
          window.location.replace('/login')
        }
      })
    }

    const getDistBgColor = (range) => {
      const colors = { '90-100': '#52c41a', '80-89': '#1890ff', '70-79': '#fa8c16', '60-69': '#f5222d' }
      return colors[range] || '#8c8c8c'
    }

    const getAvatarColor = () => {
      return userStore.getAvatarColor()
    }

    onMounted(async () => {
      await onPapersUpdated()
      initSocket()
      window.addEventListener('hashchange', handleHashChange)
    })

    onUnmounted(() => {
      disconnectSocket()
      window.removeEventListener('hashchange', handleHashChange)
    })

    return {
      user, activeTab, activatedTabs, switchTab, focusNextTab, focusPrevTab, sidebarOpen, currentVersion, upgradeInfo, checkingUpgrade, upgrading, upgradeMessage, upgradeSuccess, checkForUpgrade, performUpgrade,
      publishedPapers, formatDateTime, getAvatarColor, getDistBgColor,
      // 子组件 refs
      gradingPanelRef, questionsPanelRef, papersPanelRef, examStatsPanelRef,
      pendingGradingCount, onGraded, onQuestionsUpdated, onPapersUpdated, goToGrading,
      logout: handleLogout
    }
  }
}
</script>

<style scoped>
.toutiao-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-color);
}

:deep(.arco-btn-text) {
  white-space: nowrap;
}

.wizard-steps {
  margin-bottom: 24px;
}

.form-tip {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

.selected-row {
  background: rgba(22, 93, 255, 0.05);
}
.sidebar {
  width: 220px;
  background: var(--bg-color-white);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 100;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color-light);
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon svg { width: 18px; height: 18px; }

.brand-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-group {
  margin-bottom: 20px;
}

.nav-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 8px 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-base);
  cursor: pointer;
  color: var(--text-secondary);
  transition: var(--transition-base);
  margin-bottom: 4px;
}

.nav-item:hover {
  background: var(--bg-color-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.nav-item svg { width: 18px; height: 18px; }

.nav-item span { font-size: 14px; font-weight: 500; }

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color-light);
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.user-info { flex: 1; min-width: 0; }

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role { font-size: 12px; color: var(--text-secondary); }

.logout-btn { color: var(--text-secondary); }
.logout-btn:hover { color: var(--color-danger); }

.main-content {
  flex: 1;
  margin-left: 220px;
  padding: 24px;
  min-height: 100vh;
  max-width: 100%;
  padding-bottom: 80px;
  box-sizing: border-box;
}

.page-view {
  animation: fadeIn 0.2s ease;
  max-width: 1400px;
  margin: 0 auto;
  overflow-x: auto;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 页面头部 - 简洁清晰 - 强制刷新 v3 */
.page-header-simple {
  margin-bottom: 16px !important;
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  max-width: 100% !important;
}

.page-header-content {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  width: 100% !important;
  max-width: 100% !important;
}

.page-header-icon {
  width: 48px !important;
  height: 48px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #e8f3ff !important;
  color: var(--color-primary) !important;
  border-radius: var(--radius-base) !important;
  flex-shrink: 0 !important;
}

.page-header-icon svg {
  width: 24px !important;
  height: 24px !important;
}

.page-title {
  margin: 0 0 8px 0 !important;
  font-size: 20px !important;
  font-weight: 600 !important;
  color: var(--text-primary) !important;
}

.page-desc {
  margin: 0 !important;
  font-size: 14px !important;
  color: var(--text-secondary) !important;
}

.page-header .highlight {
  font-weight: 600;
  color: var(--color-primary);
}

/* 工具栏 - 统一样式 */
.toolbar,
.toolbar-standard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  width: 100%;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color-light);
}
.page-info { color: var(--text-secondary); font-size: 13px; }
.page-current { color: var(--primary); font-weight: 500; padding: 0 8px; }
.page-btn {
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-color);
  transition: all 0.2s;
}
.page-btn:hover { color: var(--primary); background: var(--primary-light); }

.content-card {
  border-radius: var(--radius-lg);
  width: 100%;
}

.content-card :deep(.arco-card-body) {
  padding: 0;
  width: 100%;
  overflow-x: auto;
}

.content-card :deep(.arco-tabs-content) {
  padding: 12px;
  margin-top: 0;
}

.content-card :deep(.arco-tabs-nav) {
  margin-bottom: 0;
  padding: 0 16px;
  max-width: 100%;
  overflow-x: visible;
}

.content-card :deep(.arco-tabs-content-wrapper) {
  margin-top: 0;
}

.content-card :deep(.arco-tabs-nav-tab) {
  max-width: 100%;
  overflow-x: auto;
  flex-wrap: nowrap;
}

.content-card :deep(.arco-tabs-nav-tab-list) {
  flex-wrap: nowrap;
  white-space: nowrap;
}

:deep(.arco-card) {
  border-radius: var(--radius-lg);
  border: none;
  box-shadow: var(--shadow-card);
}

.data-table .title-cell { max-width: 200px; }

@media (max-width: 768px) {
  .data-table { display: block; overflow-x: auto; }
  .data-table th, .data-table td { min-width: 80px; }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.stat-icon.total { background: var(--color-primary-bg); color: var(--color-primary); }
.stat-icon.avg { background: var(--color-warning-bg); color: var(--color-warning); }
.stat-icon.pass { background: var(--color-success-bg); color: var(--color-success); }
.stat-icon.top { background: #fff1f0; color: #fe5313; }

.stat-icon > * { font-size: 20px; }

.stat-value { font-size: 26px; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

.data-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; }

.chart-card, .rank-card { height: fit-content; }

.card-title { font-size: 15px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px; }
.card-title .arco-icon { font-size: 16px; color: var(--color-primary); }

.distribution-bars { display: flex; flex-direction: column; gap: 12px; }

.dist-item { display: flex; align-items: center; gap: 12px; }

.dist-label { width: 60px; font-size: 13px; color: var(--text-secondary); }

.dist-bar-wrapper { flex: 1; height: 8px; background: var(--bg-color); border-radius: 4px; overflow: hidden; }

.dist-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

.dist-count { width: 50px; font-size: 13px; color: var(--text-regular); text-align: right; }

.ranking-table { font-size: 13px; }

.new-entry {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}

.score-tag.high { background: #fff1f0; color: #f53f3f; }

/* 批量导入样式 */
.import-result {
  margin-top: 20px;
}

.import-success :deep(.arco-result-title) {
  color: #00b42a;
}

.import-error :deep(.arco-result-title) {
  color: #f53f3f;
}

.new-entry {
  animation: insertFlash 3s ease-out;
}
@keyframes insertFlash {
  0% { background: #fff1f0; }
  20% { background: #ffccc7; }
  40% { background: #fff1f0; }
  60% { background: #fff7e6; }
  80% { background: #f5f5f5; }
  100% { background: transparent; }
}

.question-form {
  padding: 8px 0;
}
.question-form .form-row {
  display: flex;
  gap: 16px;
}
.question-form .form-row .a-form-item {
  flex: 1;
}
.question-form .options-label .arco-form-item-wrapper {
  margin-bottom: 0;
}
.question-form .options-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.question-form .options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.question-form .option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.question-form .option-key-tag {
  flex-shrink: 0;
  width: 32px;
  text-align: center;
  font-weight: 600;
}
.question-form .option-input {
  flex: 1;
}
.question-form .option-delete {
  flex-shrink: 0;
  opacity: 0.6;
}
.question-form .option-delete:hover {
  opacity: 1;
}
.question-form .add-option-btn {
  width: 100%;
  margin-top: 8px;
}
.question-form .answer-label .arco-select-view-single,
.question-form .answer-label .arco-select-view-multiple {
  width: 100%;
}

:deep(.arco-tabs-nav) { margin-bottom: 20px; }
:deep(.arco-input-wrapper) { border-radius: var(--radius-base) !important; }
:deep(.arco-btn) { border-radius: var(--radius-base) !important; }

.exam-url-content { text-align: center; }
.exam-url-content .url-tip { color: var(--text-secondary); margin-bottom: 16px; font-size: 13px; }
.exam-url-content .qr-wrapper { margin-bottom: 16px; }
.exam-url-content .qr-wrapper img { width: 160px; height: 160px; border-radius: 8px; border: 1px solid var(--border-color); }
.exam-url-content .arco-input { color: var(--text-primary) !important; }
.exam-url-content .arco-input input { color: var(--text-primary) !important; text-align: center; }

.footer {
  position: fixed;
  bottom: 0;
  left: 220px;
  right: 0;
  text-align: center;
  padding: 12px 16px;
  color: var(--text-secondary);
  font-size: 13px;
  background: var(--bg-color);
  border-top: 1px solid var(--border-color-light);
  z-index: 1;
}

.rich-editor-wrapper {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-base);
  overflow: hidden;
}

.rich-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.rich-editor-content {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  outline: none;
  line-height: 1.6;
}

.rich-editor-content:empty:before {
  content: '请输入公告内容...';
  color: var(--text-secondary);
}

.rich-editor-content img {
  max-width: 100%;
  height: auto;
}

/* 待评分表格样式 */
.student-name-link {
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
}

.paper-title-text {
  color: var(--text-primary);
}

.score-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}

.score-badge-empty {
  background: var(--bg-color);
  color: var(--text-secondary);
}

/* ===== 待评分页面样式 - 遵循 Arco Design 原则 ===== */

/* 空状态 - 使用 Arco Empty 组件样式 */
.empty-state-standard {
  padding: 60px 0;
  background: #fff;
  border-radius: 8px;
}

/* 表格样式 - 简洁清晰 */
.grading-table-standard {
  background: #fff;
  border-radius: var(--radius-base);
}

.grading-table-standard :deep(.arco-table-td) {
  padding: 14px;
  border-bottom-color: var(--border-color-light);
}

.grading-table-standard :deep(.arco-table-th) {
  padding: 14px;
  background: var(--bg-color-light);
  font-weight: 600;
  color: var(--text-primary);
  border-bottom-color: var(--border-color-light);
}

.grading-table-standard :deep(.arco-table-row:hover) {
  background: var(--bg-color-hover);
  cursor: pointer;
}

/* 学生单元格 */
.student-cell-standard {
  display: flex;
  align-items: center;
}

.student-name-standard {
  color: var(--color-primary);
  font-weight: 500;
  font-size: 14px;
}

/* 试卷标题 */
.paper-title-standard {
  color: var(--text-primary);
  font-size: 14px;
}

/* 分数单元格 */
.score-cell-standard {
  display: flex;
  align-items: center;
  gap: 4px;
}

.score-value-standard {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
}

.score-total-standard {
  font-size: 13px;
  color: var(--text-secondary);
}

.score-dash-standard {
  color: var(--text-secondary);
  font-size: 13px;
}

/* 时间单元格 */
.time-cell-standard {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.no-essay-standard {
  color: var(--text-secondary);
  font-size: 13px;
}

/* 评卷抽屉样式 */
.grading-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.grading-drawer-header {
  background: linear-gradient(135deg, var(--bg-color-light) 0%, var(--bg-color-white) 100%);
  padding: 20px;
  border-radius: var(--radius-base);
  margin-bottom: 20px;
  border: 1px solid var(--border-color-light);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-meta {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.meta-label {
  color: var(--text-secondary);
  font-size: 13px;
  min-width: 70px;
}

.meta-value {
  color: var(--text-primary);
  font-weight: 500;
}

.score-highlight {
  color: var(--color-primary);
  font-size: 15px;
  font-weight: 600;
}

.grading-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.grading-drawer-item {
  background: var(--bg-color-white);
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-base);
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.grading-drawer-item:last-child {
  margin-bottom: 0;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.item-index {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-title {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  padding: 16px;
  background: var(--bg-color-light);
  border-radius: var(--radius-base);
  border-left: 3px solid var(--color-primary);
}

.answer-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.answer-text {
  padding: 14px;
  background: var(--bg-color);
  border-radius: var(--radius-base);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  min-height: 60px;
  white-space: pre-wrap;
  border: 1px solid var(--border-color-light);
}

.score-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px dashed var(--border-color);
}

.score-unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.grading-drawer-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
  border-top: 1px solid var(--border-color);
}
</style>
