<template>
  <a-modal
    :visible="visible"
    title="数据统计"
    :width="900"
    :footer="null"
    :mask-closable="true"
    @update:visible="$emit('update:visible', $event)"
  >
    <div v-if="loading" class="loading-wrapper">
      <a-skeleton :animation="true">
        <a-skeleton-line :rows="5" />
      </a-skeleton>
    </div>

    <div v-else-if="stats" class="stats-container">
      <!-- 核心指标 -->
      <a-row :gutter="16" class="stats-row">
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.views?.total || 0 }}</div>
            <div class="stat-label">总浏览量</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.signups?.total || 0 }}</div>
            <div class="stat-label">总报名数</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.conversion_rate || 0 }}%</div>
            <div class="stat-label">转化率</div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats.shares || 0 }}</div>
            <div class="stat-label">分享次数</div>
          </div>
        </a-col>
      </a-row>

      <!-- 报名状态分布 -->
      <a-divider orientation="left">报名状态分布</a-divider>
      <a-row :gutter="16" class="stats-row">
        <a-col :span="8">
          <div class="stat-item approved">
            <div class="stat-value">{{ stats.signups?.approved || 0 }}</div>
            <div class="stat-label">已通过</div>
          </div>
        </a-col>
        <a-col :span="8">
          <div class="stat-item pending">
            <div class="stat-value">{{ stats.signups?.pending || 0 }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </a-col>
        <a-col :span="8">
          <div class="stat-item rejected">
            <div class="stat-value">{{ stats.signups?.rejected || 0 }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
        </a-col>
      </a-row>

      <!-- 来源统计 -->
      <a-divider orientation="left">报名来源</a-divider>
      <div class="source-stats">
        <div class="source-item">
          <span class="source-name">在线报名</span>
          <a-progress :percent="getSourcePercent('online')" :show-text="true" />
          <span class="source-count">{{ stats.signups?.by_source?.online || 0 }}</span>
        </div>
        <div class="source-item">
          <span class="source-name">手动添加</span>
          <a-progress :percent="getSourcePercent('manual')" :show-text="true" color="green" />
          <span class="source-count">{{ stats.signups?.by_source?.manual || 0 }}</span>
        </div>
      </div>

      <!-- 班次统计 -->
      <a-divider orientation="left">班次报名情况</a-divider>
      <div v-if="classStats.length > 0" class="class-stats">
        <div v-for="cls in classStats" :key="cls.id" class="class-item">
          <span class="class-name">{{ cls.name }}</span>
          <a-progress
            :percent="getClassPercent(cls)"
            :show-text="true"
            :status="cls.isFull ? 'danger' : 'normal'"
          />
          <span class="class-count" :class="{ 'full': cls.isFull }">
            {{ cls.count }}/{{ cls.max_count || '∞' }}
          </span>
        </div>
      </div>
      <a-empty v-else description="暂无班次数据" />
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { getPromotionStats } from '@/api'

const props = defineProps({
  visible: Boolean,
  promotion: Object
})

const emit = defineEmits(['update:visible'])

const loading = ref(false)
const stats = ref(null)

const classStats = computed(() => {
  if (!props.promotion?.signup_config?.classes) return []
  const classes = props.promotion.signup_config.classes
  // 这里需要从父组件或API获取各班次报名人数
  return classes.map(c => ({
    ...c,
    count: 0, // 实际数据需要从signups统计
    isFull: c.max_count && c.count >= c.max_count
  }))
})

const getSourcePercent = (source) => {
  const total = stats.value?.signups?.total || 0
  if (total === 0) return 0
  const count = stats.value?.signups?.by_source?.[source] || 0
  return Math.round((count / total) * 100)
}

const getClassPercent = (cls) => {
  if (!cls.max_count) return 0
  return Math.round((cls.count / cls.max_count) * 100)
}

const fetchStats = async () => {
  if (!props.promotion?.id) return

  loading.value = true
  try {
    const res = await getPromotionStats(props.promotion.id)
    if (res.success) {
      stats.value = res.data
    }
  } catch (error) {
    Message.error('获取统计数据失败')
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val && props.promotion?.id) {
    fetchStats()
  }
})
</script>

<style scoped>
.loading-wrapper {
  padding: 40px;
}

.stats-container {
  padding: 16px 0;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  background: linear-gradient(135deg, var(--color-primary-light-1) 0%, var(--color-primary-light-2) 100%);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-card .stat-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--color-primary);
  line-height: 1.2;
}

.stat-card .stat-label {
  font-size: 14px;
  color: var(--color-text-2);
  margin-top: 8px;
}

.stat-item {
  background: var(--color-fill-2);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-item .stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-item .stat-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

.stat-item.approved .stat-value {
  color: var(--color-success);
}

.stat-item.pending .stat-value {
  color: var(--color-warning);
}

.stat-item.rejected .stat-value {
  color: var(--color-danger);
}

.source-stats {
  padding: 0 8px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.source-name {
  width: 80px;
  font-size: 14px;
  color: var(--color-text-2);
}

.source-item :deep(.arco-progress) {
  flex: 1;
}

.source-count {
  width: 50px;
  text-align: right;
  font-size: 14px;
  color: var(--color-text-1);
}

.class-stats {
  padding: 0 8px;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.class-name {
  width: 120px;
  font-size: 14px;
  color: var(--color-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-item :deep(.arco-progress) {
  flex: 1;
}

.class-count {
  width: 60px;
  text-align: right;
  font-size: 14px;
  color: var(--color-text-1);
}

.class-count.full {
  color: var(--color-danger);
}
</style>
