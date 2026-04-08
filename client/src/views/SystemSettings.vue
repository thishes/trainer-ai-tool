<template>
  <div class="page-view">
    <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">系统设置</h1>
          <p class="page-desc">系统监控、数据统计与配置管理</p>
        </div>
      </div>
    </div>

    <a-card class="content-card">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="server" title="服务器信息">
          <template v-if="loading.server">
            <a-skeleton :animation="true">
              <a-skeleton-line :widths="['100%', '80%', '60%', '70%', '50%']" :rows="5" />
            </a-skeleton>
          </template>
          <template v-else>
            <a-descriptions :column="2" bordered>
              <a-descriptions-item label="平台">{{ serverInfo.platform || '-' }}</a-descriptions-item>
              <a-descriptions-item label="架构">{{ serverInfo.arch || '-' }}</a-descriptions-item>
              <a-descriptions-item label="Node版本">{{ serverInfo.nodeVersion || '-' }}</a-descriptions-item>
              <a-descriptions-item label="端口">{{ serverInfo.port || '-' }}</a-descriptions-item>
              <a-descriptions-item label="运行时间">{{ formatUptime(serverInfo.uptime) }}</a-descriptions-item>
              <a-descriptions-item label="环境">{{ serverInfo.env || '-' }}</a-descriptions-item>
              <a-descriptions-item label="进程ID">{{ serverInfo.pid || '-' }}</a-descriptions-item>
            </a-descriptions>
          </template>
        </a-tab-pane>

        <a-tab-pane key="metrics" title="运行指标">
          <template v-if="loading.metrics">
            <div class="metrics-grid">
              <a-card v-for="i in 6" :key="i" class="metric-card">
                <a-skeleton :animation="true">
                  <a-skeleton-line :widths="['60%', '80%']" :rows="2" />
                </a-skeleton>
              </a-card>
            </div>
          </template>
          <template v-else>
            <div class="metrics-grid">
              <a-card title="内存" class="metric-card">
                <a-statistic :value="metrics.memory?.used" :suffix="`/ ${metrics.memory?.total}`">
                  <template #prefix>已用: </template>
                </a-statistic>
                <a-space direction="vertical" style="margin-top: 12px; width: 100%;">
                  <div class="metric-row">
                    <span>已用</span>
                    <span>{{ metrics.memory?.used || 0 }} MB</span>
                  </div>
                  <div class="metric-row">
                    <span>空闲</span>
                    <span>{{ metrics.memory?.free || 0 }} MB</span>
                  </div>
                  <a-progress :percent="metrics.memory?.usagePercent || 0" :color="getUsageColor(metrics.memory?.usagePercent)"/>
                </a-space>
              </a-card>

              <a-card title="CPU" class="metric-card">
                <a-statistic :value="metrics.cpu?.usagePercent" suffix="%">
                  <template #prefix>使用率: </template>
                </a-statistic>
                <a-space direction="vertical" style="margin-top: 12px; width: 100%;">
                  <div class="metric-row">
                    <span>核心数</span>
                    <span>{{ metrics.cpu?.cores || 0 }}</span>
                  </div>
                  <div class="metric-row">
                    <span>型号</span>
                    <span class="model-name">{{ metrics.cpu?.model || '-' }}</span>
                  </div>
                </a-space>
              </a-card>

              <a-card title="网络" class="metric-card">
                <div class="metric-row">
                  <span>主IP</span>
                  <span>{{ metrics.network?.primaryIP || '-' }}</span>
                </div>
                <div class="metric-row" style="margin-top: 8px;">
                  <span>接口数</span>
                  <span>{{ metrics.network?.interfaces || 0 }}</span>
                </div>
              </a-card>

              <a-card title="事件循环" class="metric-card">
                <a-statistic :value="metrics.eventLoopLag?.toFixed(2)" suffix="ms">
                  <template #prefix>延迟: </template>
                </a-statistic>
              </a-card>

              <a-card title="活动句柄" class="metric-card">
                <a-statistic :value="metrics.activeHandles || 0">
                  <template #title>活动句柄数</template>
                </a-statistic>
              </a-card>

              <a-card title="活动请求" class="metric-card">
                <a-statistic :value="metrics.activeRequests || 0">
                  <template #title>活动请求数</template>
                </a-statistic>
              </a-card>
            </div>
          </template>
        </a-tab-pane>

        <a-tab-pane key="stats" title="数据统计">
          <template v-if="loading.stats">
            <div class="stats-grid">
              <a-card v-for="i in 5" :key="i">
                <a-skeleton :animation="true">
                  <a-skeleton-line :widths="['60%', '80%', '70%']" :rows="3" />
                </a-skeleton>
              </a-card>
            </div>
          </template>
          <template v-else>
            <div class="stats-grid">
              <a-card title="用户统计">
                <a-space direction="vertical" style="width: 100%;">
                  <div class="stat-row">
                    <span>总数</span>
                    <a-statistic :value="stats.users?.total || 0"></a-statistic>
                  </div>
                  <div class="stat-row">
                    <span>管理员</span>
                    <a-tag color="red">{{ stats.users?.admins || 0 }}</a-tag>
                  </div>
                  <div class="stat-row">
                    <span>培训师</span>
                    <a-tag color="blue">{{ stats.users?.trainers || 0 }}</a-tag>
                  </div>
                  <div class="stat-row">
                    <span>学生</span>
                    <a-tag color="green">{{ stats.users?.students || 0 }}</a-tag>
                  </div>
                </a-space>
              </a-card>

              <a-card title="题目统计">
                <a-space direction="vertical" style="width: 100%;">
                  <div class="stat-row">
                    <span>总数</span>
                    <a-statistic :value="stats.questions?.total || 0"></a-statistic>
                  </div>
                  <div class="stat-row">
                    <span>活跃</span>
                    <a-tag color="green">{{ stats.questions?.active || 0 }}</a-tag>
                  </div>
                  <div class="stat-row">
                    <span>单选</span>
                    <span>{{ stats.questions?.byType?.single || 0 }}</span>
                  </div>
                  <div class="stat-row">
                    <span>多选</span>
                    <span>{{ stats.questions?.byType?.multiple || 0 }}</span>
                  </div>
                  <div class="stat-row">
                    <span>判断</span>
                    <span>{{ stats.questions?.byType?.judge || 0 }}</span>
                  </div>
                  <div class="stat-row">
                    <span>问答</span>
                    <span>{{ stats.questions?.byType?.subjective || 0 }}</span>
                  </div>
                </a-space>
              </a-card>

              <a-card title="试卷统计">
                <a-space direction="vertical" style="width: 100%;">
                  <div class="stat-row">
                    <span>总数</span>
                    <a-statistic :value="stats.papers?.total || 0"></a-statistic>
                  </div>
                  <div class="stat-row">
                    <span>已发布</span>
                    <a-tag color="green">{{ stats.papers?.published || 0 }}</a-tag>
                  </div>
                  <div class="stat-row">
                    <span>草稿</span>
                    <a-tag color="gray">{{ stats.papers?.draft || 0 }}</a-tag>
                  </div>
                </a-space>
              </a-card>

              <a-card title="考试记录">
                <a-space direction="vertical" style="width: 100%;">
                  <div class="stat-row">
                    <span>总数</span>
                    <a-statistic :value="stats.examRecords?.total || 0"></a-statistic>
                  </div>
                  <div class="stat-row">
                    <span>待处理</span>
                    <a-tag color="orange">{{ stats.examRecords?.pending || 0 }}</a-tag>
                  </div>
                  <div class="stat-row">
                    <span>已完成</span>
                    <a-tag color="blue">{{ stats.examRecords?.completed || 0 }}</a-tag>
                  </div>
                  <div class="stat-row">
                    <span>已评分</span>
                    <a-tag color="green">{{ stats.examRecords?.graded || 0 }}</a-tag>
                  </div>
                </a-space>
              </a-card>

              <a-card title="公告">
                <a-statistic :value="stats.announcements?.total || 0">
                  <template #title>公告数量</template>
                </a-statistic>
              </a-card>
            </div>
          </template>
        </a-tab-pane>

        <a-tab-pane key="database" title="数据库监测">
          <template v-if="loading.database">
            <a-skeleton :animation="true">
              <a-skeleton-line :widths="['100%', '80%', '60%', '70%']" :rows="8" />
            </a-skeleton>
          </template>
          <template v-else>
            <a-row :gutter="16" style="margin-bottom: 16px;">
              <a-col :span="12">
                <a-card title="存储模式" size="small" style="margin-bottom: 16px;">
                  <a-descriptions :column="1" size="small">
                    <a-descriptions-item label="当前模式">
                      <a-tag :color="getModeColor(dbStats.mode)">{{ getModeText(dbStats.mode) }}</a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="MySQL连接">
                      <a-tag :color="dbStats.mysqlConnected ? 'green' : 'red'">
                        {{ dbStats.mysqlConnected ? '已连接' : '未连接' }}
                      </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="双写模式">
                      <a-tag :color="dbStats.useDualWrite ? 'blue' : 'gray'">
                        {{ dbStats.useDualWrite ? '启用' : '禁用' }}
                      </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="降级模式">
                      <a-tag :color="dbStats.degradedMode ? 'orange' : 'green'">
                        {{ dbStats.degradedMode ? '启用' : '禁用' }}
                      </a-tag>
                    </a-descriptions-item>
                  </a-descriptions>
                </a-card>
                <a-card title="同步状态" size="small">
                  <a-descriptions :column="1" size="small">
                    <a-descriptions-item label="同步状态">
                      <a-tag :color="dbStats.syncInProgress ? 'arcoblue' : 'green'">
                        {{ dbStats.syncInProgress ? '同步中...' : '空闲' }}
                      </a-tag>
                    </a-descriptions-item>
                    <a-descriptions-item label="最后同步">
                      {{ formatTimestamp(dbStats.lastSync) }}
                    </a-descriptions-item>
                  </a-descriptions>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="数据库状态" size="small" style="margin-bottom: 16px;">
                  <a-tag :color="dbStats.health?.status === 'healthy' ? 'green' : 'red'" style="margin-bottom: 8px;">
                    {{ dbStats.health?.status === 'healthy' ? '健康' : '异常' }}
                  </a-tag>
                  <div class="metric-row">
                    <span>类型</span>
                    <span>{{ dbStats.type?.toUpperCase() || 'JSON' }}</span>
                  </div>
                  <div v-if="dbStats.host" class="metric-row">
                    <span>主机</span>
                    <span>{{ dbStats.host }}:{{ dbStats.port }}</span>
                  </div>
                  <div v-if="dbStats.database" class="metric-row">
                    <span>数据库</span>
                    <span>{{ dbStats.database }}</span>
                  </div>
                  <div v-if="dbStats.sizeFormatted" class="metric-row">
                    <span>文件大小</span>
                    <span>{{ dbStats.sizeFormatted }}</span>
                  </div>
                  <div v-if="dbStats.lastModified" class="metric-row">
                    <span>最后修改</span>
                    <span>{{ formatTimestamp(dbStats.lastModified) }}</span>
                  </div>
                  <div class="metric-row">
                    <span>总记录数</span>
                    <span>{{ dbStats.totalRecords || 0 }}</span>
                  </div>
                </a-card>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="24">
                <a-card title="数据表统计" size="small">
                  <template v-if="loading.database">
                    <a-skeleton :animation="true">
                      <a-skeleton-line :widths="['100%', '80%', '60%']" :rows="5" />
                    </a-skeleton>
                  </template>
                  <template v-else>
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>表名</th>
                          <th>记录数</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="table in dbTableData" :key="table.name">
                          <td>{{ table.name }}</td>
                          <td>
                            <a-badge :status="table.count > 0 ? 'success' : 'default'" :text="table.count" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </a-card>
              </a-col>
            </a-row>
            <a-space style="margin-top: 16px;">
              <a-button type="primary" @click="loadDbStats">刷新</a-button>
              <a-button type="primary" status="success" :loading="backingUp" @click="backupDatabase">
                创建备份
              </a-button>
            </a-space>
          </template>
        </a-tab-pane>

        <a-tab-pane key="upgrade" title="平台升级">
          <template v-if="loading.upgrade">
            <a-skeleton :animation="true">
              <a-skeleton-line :widths="['100%', '60%']" :rows="3" />
            </a-skeleton>
          </template>
          <template v-else>
            <a-alert v-if="upgradeInfo.hasUpdate" type="success" style="margin-bottom: 16px;">
              <template #title>发现新版本</template>
              当前版本: {{ upgradeInfo.currentVersion }} → 最新版本: {{ upgradeInfo.latestVersion }}
            </a-alert>
            <a-alert v-else type="normal" style="margin-bottom: 16px;">
              <template #title>已是最新版本</template>
              当前版本: {{ upgradeInfo.currentVersion }}，暂无可用更新
            </a-alert>
            <a-space>
              <a-button type="primary" :loading="checkingUpgrade" @click="checkUpgrade">检查更新</a-button>
              <a-button type="primary" status="success" :disabled="!upgradeInfo.hasUpdate" :loading="performingUpgrade" @click="performUpgrade">
                执行升级
              </a-button>
            </a-space>
          </template>
        </a-tab-pane>

        <a-tab-pane key="logs" title="系统日志">
          <div class="toolbar-standard">
            <div class="toolbar-left">
              <a-select v-model="logFilter.type" style="width: 120px" @change="loadLogs">
                <a-option value="all">全部</a-option>
                <a-option value="system">系统</a-option>
                <a-option value="error">错误</a-option>
              </a-select>
              <a-button @click="loadLogs">
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </template>
                刷新
              </a-button>
              <a-button status="danger" @click="clearLogs">清空日志</a-button>
            </div>
          </div>
          <template v-if="loading.logs">
            <a-skeleton :animation="true">
              <a-skeleton-line :widths="['100%', '80%', '60%', '70%', '50%']" :rows="8" />
            </a-skeleton>
          </template>
          <template v-else>
            <table class="data-table">
              <thead>
                <tr>
                  <th width="180">时间</th>
                  <th width="100">类型</th>
                  <th>消息</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="logs.length === 0">
                  <td colspan="3">
                    <a-empty description="暂无日志" />
                  </td>
                </tr>
                <tr v-for="log in logs" :key="log.id || log.timestamp">
                  <td>{{ formatTimestamp(log.timestamp) }}</td>
                  <td>
                    <a-tag :color="getLogTypeColor(log.type)">{{ log.type }}</a-tag>
                  </td>
                  <td>{{ log.message }}</td>
                </tr>
              </tbody>
            </table>
            <div class="pagination" v-if="logTotal > 0">
              <span class="page-info">{{ logTotal }} 条日志</span>
              <span class="page-btn" @click="logPage = 1">首页</span>
              <span class="page-btn" @click="logPage > 1 && logPage--">上一页</span>
              <span class="page-current">{{ logPage }} / {{ totalLogPages }}</span>
              <span class="page-btn" @click="logPage < totalLogPages && logPage++">下一页</span>
              <span class="page-btn" @click="logPage = totalLogPages">末页</span>
            </div>
          </template>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import api from '@/api'

const activeTab = ref('server')

const serverInfo = ref({})
const metrics = ref({})
const stats = ref({})
const upgradeInfo = ref({})

const loading = reactive({
  server: false,
  metrics: false,
  stats: false,
  database: false,
  upgrade: false,
  logs: false
})

const checkingUpgrade = ref(false)
const performingUpgrade = ref(false)

const logs = ref([])
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = ref(50)
const logFilter = ref({ type: 'all' })

let metricsTimer = null

const totalLogPages = computed(() => Math.ceil(logTotal.value / logPageSize) || 1)

const dbStats = ref({})
const dbTableData = ref([])
const backingUp = ref(false)

const loadDbStats = async () => {
  loading.database = true
  try {
    const res = await api.get('/system/database')
    if (res.success && res.data) {
      dbStats.value = res.data
      const tables = res.data.tables || {}
      dbTableData.value = [
        { name: '用户 (users)', count: tables.users?.count || 0 },
        { name: '分类 (categories)', count: tables.categories?.count || 0 },
        { name: '题目 (questions)', count: tables.questions?.count || 0 },
        { name: '试卷 (papers)', count: tables.papers?.count || 0 },
        { name: '考试记录 (examRecords)', count: tables.examRecords?.count || 0 },
        { name: '公告 (announcements)', count: tables.announcements?.count || 0 },
        { name: '学生 (students)', count: tables.students?.count || 0 },
        { name: '主观题评分 (essayScores)', count: tables.essayScores?.count || 0 }
      ]
    }
  } catch (e) {
    Message.error('加载数据库信息失败')
  } finally {
    loading.database = false
  }
}

const backupDatabase = async () => {
  backingUp.value = true
  try {
    const res = await api.post('/system/database/backup')
    if (res.success) {
      Message.success({
        content: `备份成功: ${res.data.path}`,
        duration: 5000
      })
    }
  } catch (e) {
    Message.error('备份失败')
  } finally {
    backingUp.value = false
  }
}

const loadServerInfo = async () => {
  loading.server = true
  try {
    const res = await api.get('/system/info')
    if (res.success && res.data) {
      serverInfo.value = res.data
    }
  } catch (e) {
    Message.error('加载服务器信息失败')
  } finally {
    loading.server = false
  }
}

const loadMetrics = async () => {
  loading.metrics = true
  try {
    const res = await api.get('/system/metrics')
    if (res.success && res.data) {
      metrics.value = res.data
    }
  } catch (e) {
    Message.error('加载运行指标失败')
  } finally {
    loading.metrics = false
  }
}

const loadStats = async () => {
  loading.stats = true
  try {
    const res = await api.get('/system/stats')
    if (res.success && res.data) {
      stats.value = res.data
    }
  } catch (e) {
    Message.error('加载数据统计失败')
  } finally {
    loading.stats = false
  }
}

const checkUpgrade = async () => {
  checkingUpgrade.value = true
  try {
    const res = await api.get('/system/upgrade/check')
    if (res.success && res.data) {
      upgradeInfo.value = res.data
      if (res.data.hasUpdate) {
        Message.success('发现新版本: ' + res.data.latestVersion)
      } else {
        Message.info('已是最新版本')
      }
    }
  } catch (e) {
    Message.error('检查更新失败')
  } finally {
    checkingUpgrade.value = false
  }
}

const performUpgrade = () => {
  Modal.confirm({
    title: '确认升级',
    content: `确定要升级到版本 ${upgradeInfo.value.latestVersion} 吗？升级过程可能需要几分钟，期间服务将暂时中断。`,
    okText: '确认升级',
    cancelText: '取消',
    type: 'warning',
    onOk: async () => {
      performingUpgrade.value = true
      try {
        const res = await api.post('/system/upgrade', { version: upgradeInfo.value.latestVersion })
        if (res.success) {
          Message.success({
            content: res.message || '升级成功',
            duration: 5000
          })
          if (res.requiresRestart) {
            Modal.warning({
              title: '需要重启服务',
              content: '升级已完成，请手动重启服务以应用更新。重启后系统将自动加载新版本。',
              okText: '确定'
            })
          }
          await checkUpgrade()
        }
      } catch (e) {
        Message.error(e.message || '升级失败')
      } finally {
        performingUpgrade.value = false
      }
    }
  })
}

const loadLogs = async () => {
  loading.logs = true
  try {
    const res = await api.get('/system/logs', {
      params: {
        type: logFilter.value.type,
        page: logPage.value,
        pageSize: logPageSize.value
      }
    })
    if (res.success && res.data) {
      logs.value = res.data.logs || []
      logTotal.value = res.data.total || 0
    }
  } catch (e) {
    Message.error('加载日志失败')
  } finally {
    loading.logs = false
  }
}

const clearLogs = () => {
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空系统日志吗？此操作不可撤销。',
    okText: '确认清空',
    cancelText: '取消',
    type: 'warning',
    onOk: async () => {
      try {
        const res = await api.post('/system/clear-logs', { type: logFilter.value.type })
        if (res.success) {
          Message.success('日志已清空')
          loadLogs()
        }
      } catch (e) {
        Message.error('清空日志失败')
      }
    }
  })
}

const formatUptime = (seconds) => {
  if (!seconds) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`
  if (hours > 0) return `${hours}小时 ${minutes}分钟`
  return `${minutes}分钟`
}

const formatTimestamp = (ts) => {
  if (!ts) return '-'
  const date = new Date(ts)
  return date.toLocaleString('zh-CN')
}

const getUsageColor = (percent) => {
  if (percent >= 90) return '#f53f3f'
  if (percent >= 70) return '#ff7d00'
  return '#00b42a'
}

const getLogTypeColor = (type) => {
  switch (type) {
    case 'error': return 'red'
    case 'system': return 'blue'
    default: return 'gray'
  }
}

const getModeColor = (mode) => {
  switch (mode) {
    case 'dual_write': return 'blue'
    case 'mysql_only': return 'cyan'
    case 'json_only': return 'green'
    case 'degraded': return 'orange'
    default: return 'gray'
  }
}

const getModeText = (mode) => {
  switch (mode) {
    case 'dual_write': return '双写模式'
    case 'mysql_only': return 'MySQL仅存'
    case 'json_only': return 'JSON仅存'
    case 'degraded': return '降级模式'
    default: return '未知'
  }
}

onMounted(() => {
  loadServerInfo()
  loadMetrics()
  loadStats()
  // 不自动检查更新，用户需要手动点击"检查更新"按钮
  loadLogs()

  metricsTimer = setInterval(() => {
    if (activeTab.value === 'metrics') {
      loadMetrics()
    }
  }, 30000)
})

onUnmounted(() => {
  if (metricsTimer) {
    clearInterval(metricsTimer)
  }
})
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  height: 100%;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.model-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 0;
}

.page-info {
  color: var(--color-text-3);
  font-size: 14px;
}

.page-btn {
  cursor: pointer;
  color: var(--color-link);
  font-size: 14px;
}

.page-btn:hover {
  color: var(--color-link-hover);
}

.page-current {
  color: var(--color-text-1);
  font-size: 14px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .metrics-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 页面头部样式 */
.page-header-simple {
  margin-bottom: 16px;
  width: 100%;
}

.page-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.page-header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f3ff;
  color: var(--color-primary);
  border-radius: var(--radius-base);
  flex-shrink: 0;
}

.page-header-icon svg {
  width: 24px;
  height: 24px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
