<template>
  <div class="page-view">
    <!-- 页面头部 -->
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">考试数据</h1>
          <p class="page-desc">实时查看考试统计数据和学员排名</p>
        </div>
      </div>
    </div>
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-select v-model="selectedPaper" placeholder="选择试卷查看数据" style="width: 240px" @change="loadStats" :disabled="publishedPapers.length === 0">
          <a-option v-for="p in publishedPapers" :key="p.id" :label="p.title" :value="p.id" />
        </a-select>
      </div>
    </div>
    <div v-if="!selectedPaper" class="empty-state">
      <a-empty description="请选择试卷查看考试数据" />
    </div>
    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total"><icon-user /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total_submitted || 0 }}</div>
            <div class="stat-label">提交人数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon avg"><icon-dashboard /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.avg_score || 0 }}</div>
            <div class="stat-label">平均分</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pass"><icon-check-circle /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pass_rate || 0 }}%</div>
            <div class="stat-label">及格率</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon top"><icon-trophy /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.ranking?.[0]?.score || '-' }}</div>
            <div class="stat-label">最高分</div>
          </div>
        </div>
      </div>
      <div class="data-grid">
        <a-card class="chart-card" v-if="stats.distribution?.length">
          <template #header>
            <span class="card-title"><icon-bar-chart /> 分数分布</span>
          </template>
          <div class="distribution-bars">
            <div v-for="d in stats.distribution" :key="d.range" class="dist-item">
              <div class="dist-label">{{ d.range }}</div>
              <div class="dist-bar-wrapper">
                <div class="dist-bar" :style="{ width: stats.total_submitted ? (d.count / stats.total_submitted * 100) + '%' : '0%', backgroundColor: getDistBgColor(d.range) }"></div>
              </div>
              <div class="dist-count">{{ d.count }}人</div>
            </div>
          </div>
        </a-card>
        <a-card class="rank-card" v-if="stats.ranking?.length">
          <template #header>
            <span class="card-title"><icon-robot /> 实时排名</span>
            <a-tag type="success" size="small">Top {{ stats.ranking.length }}</a-tag>
          </template>
          <table class="data-table ranking-table">
            <thead>
              <tr>
                <th width="60">排名</th>
                <th>学员</th>
                <th width="60">分数</th>
                <th width="140">交卷时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in stats.ranking" :key="r.rank + '-' + r.student_name" :class="{ 'new-entry': r.isNew }">
                <td align="center">
                  <span class="rank-badge" :class="{ gold: r.rank === 1, silver: r.rank === 2, bronze: r.rank === 3 }">{{ r.rank }}</span>
                </td>
                <td>{{ r.student_name }}</td>
                <td align="center">
                  <span class="score-tag" :class="{ high: r.score >= 90, mid: r.score >= 70, low: r.score < 60 }">{{ r.score }}</span>
                </td>
                <td>{{ formatDateTime(r.end_time) }}</td>
              </tr>
            </tbody>
          </table>
        </a-card>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { getExamStats } from '../api'
import { useSocket } from '@/composables/useSocket'
import { IconUser, IconDashboard, IconCheckCircle, IconTrophy, IconBarChart, IconRobot } from '@arco-design/web-vue/es/icon'

function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

export default {
  name: 'ExamStatsPanel',
  components: { IconUser, IconDashboard, IconCheckCircle, IconTrophy, IconBarChart, IconRobot },
  props: {
    publishedPapers: { type: Array, default: () => [] }
  },
  setup(props) {
    const selectedPaper = ref(null)
    const stats = ref({
      ranking: [],
      total_submitted: 0,
      pass_rate: 0,
      avg_score: 0,
      distribution: [],
      highest_score: 0
    })
    const newEntryAnimation = ref(null)
    const newEntryKey = ref(0)
    let animationTimer = null

    const loadStats = async () => {
      if (!selectedPaper.value) return
      try {
        if (stats.value.paper_id) {
          leavePaperRoom(stats.value.paper_id)
        }
        const res = await getExamStats(selectedPaper.value)
        if (res.data) {
          stats.value = {
            ...res.data,
            paper_id: selectedPaper.value,
            ranking: Array.isArray(res.data.ranking) ? res.data.ranking : []
          }
          joinPaperRoom(selectedPaper.value)
        }
      } catch (e) { console.error(e) }
    }

    const getDistBgColor = (range) => {
      if (range.includes('90') || range.includes('100')) return '#00b42a'
      if (range.includes('80')) return '#165dff'
      if (range.includes('70')) return '#722ed1'
      if (range.includes('60')) return '#ff7d00'
      return '#f53f3f'
    }

    const formatDateTime = (dateStr) => {
      if (!dateStr) return '-'
      return new Date(dateStr).toLocaleString()
    }

    const debouncedUpdateStats = debounce((data) => {
      stats.value = {
        ...stats.value,
        ranking: Array.isArray(data.ranking) ? data.ranking : [],
        total_submitted: data.total_submitted
      }
    }, 300)

    const initSocket = () => {
      const socket = useSocket()

      socket.on('rank-update', (data) => {
        if (data.paper_id === selectedPaper.value) {
          const prevRanking = stats.value.ranking || []
          debouncedUpdateStats(data)
          if (data.newEntry) {
            const prevRank = prevRanking.find(r => r.student_name === data.newEntry.student_name)?.rank
            if (!prevRank || prevRank > data.newEntry.rank) {
              newEntryAnimation.value = data.newEntry
              newEntryKey.value++
              if (animationTimer) clearTimeout(animationTimer)
              animationTimer = setTimeout(() => { newEntryAnimation.value = null }, 3000)
            }
          }
        }
      })
    }

    const joinPaperRoom = (paperId) => {
      const socket = useSocket()
      socket.emit('join-paper', paperId)
    }

    const leavePaperRoom = (paperId) => {
      const socket = useSocket()
      socket.emit('leave-paper', paperId)
    }

    onMounted(() => {
      initSocket()
    })

    onUnmounted(() => {
      if (stats.value.paper_id) {
        leavePaperRoom(stats.value.paper_id)
      }
      if (animationTimer) {
        clearTimeout(animationTimer)
        animationTimer = null
      }
      const socket = useSocket()
      socket.off('rank-update')
    })

    return {
      selectedPaper, stats, newEntryAnimation, newEntryKey,
      loadStats, getDistBgColor, formatDateTime
    }
  }
}
</script>
