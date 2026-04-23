<!-- client/src/components/ProgressTracker.vue - 学习进度追踪组件 (T2.2) -->
<template>
  <div class="progress-tracker" :class="{ 'is-completed': isCompleted }">
    <!-- 进度环 -->
    <div class="progress-ring" v-if="progressData">
      <svg viewBox="0 0 100 100" class="ring-svg">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e6eb" stroke-width="8"/>
        <circle
          cx="50" cy="50" r="42" fill="none"
          :stroke="progressColor"
          stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          class="ring-progress"
        />
      </svg>
      <span class="progress-text">{{ displayPercent }}%</span>
    </div>

    <!-- 进度信息 -->
    <div class="progress-info" v-if="progressData">
      <h4 class="progress-status">{{ statusText }}</h4>
      <p class="progress-time" v-if="progressData.time_spent">
        <IconClockCircle /> {{ progressData.formatted_time_spent || formatTime(progressData.time_spent) }}
      </p>
      <p class="progress-last" v-if="showLastAccessed && progressData.last_accessed_at">
        上次学习: {{ progressData.last_accessed_relative || relativeTime(progressData.last_accessed_at) }}
      </p>
    </div>

    <!-- 断点续学按钮 -->
    <a-button
      v-if="canContinue && progressData?.last_chapter_title"
      type="primary"
      size="small"
      class="continue-btn"
      @click="$emit('continue', progressData)"
    >
      <template #icon><IconPlayArrowFill /></template>
      继续: "{{ truncate(progressData.last_chapter_title, 15) }}"
    </a-button>

    <!-- 完成状态 -->
    <div class="completed-badge" v-if="isCompleted">
      <IconCheckCircleFill style="color: #00b42a; font-size: 20px;" />
      <span>已完成</span>
    </div>

    <!-- 加载中 -->
    <a-spin v-else-if="loading" size="16" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { IconClockCircle, IconPlayArrowFill, IconCheckCircleFill } from '@arco-design/web-vue/es/icon'
import { getCourseProgress } from '@/api'

const props = defineProps({
  courseId: { type: [Number, String], required: true },
  showLastAccessed: { type: Boolean, default: true },
  autoLoad: { type: Boolean, default: true }
})

const emit = defineEmits(['continue', 'loaded'])

const loading = ref(false)
const progressData = ref(null)

const circumference = 2 * Math.PI * 42
const displayPercent = computed(() => Math.round(progressData.value?.progress_percent || 0))
const dashOffset = computed(() => circumference - (displayPercent.value / 100) * circumference)
const isCompleted = computed(() => progressData.value?.status === 'completed')
const canContinue = computed(() => !isCompleted.value && displayPercent.value > 0 && displayPercent.value < 100)

const progressColor = computed(() => {
  if (displayPercent.value >= 100) return '#00b42a'
  if (displayPercent.value >= 70) return '#165dff'
  if (displayPercent.value >= 30) return '#ff7d00'
  return '#86909c'
})

const statusText = computed(() => {
  if (!progressData.value) return '未开始学习'
  if (isCompleted.value) return '🎉 恭喜完成！'
  if (displayPercent.value > 80) return '即将完成'
  if (displayPercent.value > 0) return `学习中 ${displayPercent.value}%`
  return '准备开始'
})

async function loadProgress() {
  if (!props.courseId) return
  loading.value = true
  try {
    const res = await getCourseProgress(props.courseId)
    progressData.value = res.data?.exists ? res.data : null
    emit('loaded', progressData.value)
  } catch(e) {
    console.warn('[ProgressTracker] 加载失败:', e.message)
  } finally {
    loading.value = false
  }
}

function refresh() { loadProgress() }
defineExpose({ refresh })

onMounted(() => { if (props.autoLoad) loadProgress() })
watch(() => props.courseId, () => { if (props.autoLoad) loadProgress() })

function formatTime(s) {
  if (!s) return '0分钟'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}
function relativeTime(d) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hrs < 24) return `${hrs}小时前`
  if (days < 7) return `${days}天前`
  return new Date(d).toLocaleDateString()
}
function truncate(str, len) { return str?.length > len ? str.slice(0, len) + '...' : str }
</script>

<style scoped>
.progress-tracker {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  background: var(--color-bg-soft, #f7f8fa);
  border-radius: 8px; transition: all 0.3s;
}
.progress-tracker.is-completed { background: linear-gradient(135deg, #f0f9eb 0%, #e8ffec 100%); }

.progress-ring { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
.ring-svg { transform: rotate(-90deg); width: 100%; height: 100%; }
.ring-progress { transition: stroke-dashoffset 0.5s ease; }
.progress-text {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px; font-weight: 700; color: var(--text-1);
}

.progress-info { flex: 1; min-width: 0; }
.progress-status { margin: 0 0 2px; font-size: 13px; font-weight: 600; color: var(--text-1); }
.progress-time, .progress-last {
  margin: 0; font-size: 11px; color: var(--text-3); line-height: 1.6;
  display: flex; align-items: center; gap: 3px;
}
.continue-btn { margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.completed-badge { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #00b42a; }

@media screen and (max-width: 767.98px) {
  .progress-tracker { padding: 8px 10px; gap: 8px; }
  .progress-ring { width: 40px; height: 40px; }
  .progress-text { font-size: 11px; }
  .continue-btn { max-width: 140px; }
}
</style>
