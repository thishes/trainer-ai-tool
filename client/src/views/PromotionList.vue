<template>
  <div class="page-view">
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">宣传文案</h1>
          <p class="page-desc">管理海报与报名宣传文案</p>
        </div>
      </div>
    </div>
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-button type="primary" @click="handleCreate">+ 新建文案</a-button>
        <div class="search-wrapper">
          <a-input v-model="searchTitle" placeholder="搜索标题..." style="width: 200px" @keyup.enter="loadPromotions" allow-clear>
            <template #prefix><icon-search /></template>
          </a-input>
          <a-select v-model="filterStatus" placeholder="状态" style="width: 100px" @change="loadPromotions" allow-clear>
            <a-option value="draft">草稿</a-option>
            <a-option value="published">已发布</a-option>
          </a-select>
          <a-select v-model="filterLocked" placeholder="锁定" style="width: 100px" @change="loadPromotions" allow-clear>
            <a-option value="locked">已锁定</a-option>
            <a-option value="unlocked">未锁定</a-option>
          </a-select>
          <a-button @click="handleReset" v-if="searchTitle || filterStatus || filterLocked">
            <template #icon><icon-refresh /></template>
            重置
          </a-button>
        </div>
      </div>
    </div>
    <a-card class="content-card">
      <a-table :columns="columns" :data="promotions" :loading="loading" :pagination="false" row-key="id" :scroll="{ x: 800 }">
        <template #title="{ record }">
          <span class="title-cell">{{ record.title }}</span>
        </template>
        <template #status="{ record }">
          <span :class="record.status === 'published' ? 'tag tag-green' : 'tag tag-gray'">
            {{ record.status === 'published' ? '已发布' : '草稿' }}
          </span>
        </template>
        <template #locked="{ record }">
          <span :class="record.locked ? 'tag tag-red' : 'tag tag-green'">
            {{ record.locked ? '已锁定' : '未锁定' }}
          </span>
        </template>
        <template #enable_signup="{ record }">
          <span :class="record.enable_signup ? 'tag tag-blue' : 'tag tag-gray'">
            {{ record.enable_signup ? '开启' : '关闭' }}
          </span>
        </template>
        <template #created_at="{ record }">
          {{ formatDateTime(record.created_at) }}
        </template>
        <template #action="{ record }">
          <div class="action-group">
            <a-link @click="handleEdit(record)">编辑</a-link>
            <a-button type="text" status="danger" size="small" @click="handleDelete(record.id)">删除</a-button>
            <a-button v-if="user.role === 'admin'" type="text" size="small" @click="handleToggleLock(record)">
              {{ record.locked ? '解锁' : '锁定' }}
            </a-button>
          </div>
        </template>
      </a-table>
      <div class="pagination" v-if="totalCount > pageSize">
        <a-select v-model="pageSize" style="width: 80px" @change="loadPromotions">
          <a-option :value="10">10 条</a-option>
          <a-option :value="15">15 条</a-option>
          <a-option :value="20">20 条</a-option>
          <a-option :value="50">50 条</a-option>
        </a-select>
        <span class="page-btn" @click="page = 1; loadPromotions()">首页</span>
        <span class="page-btn" @click="page > 1 && (page--, loadPromotions())">上一页</span>
        <span class="page-current">{{ page }} / {{ Math.ceil(totalCount / pageSize) }}</span>
        <span class="page-btn" @click="page < Math.ceil(totalCount / pageSize) && (page++, loadPromotions())">下一页</span>
        <span class="page-btn" @click="page = Math.ceil(totalCount / pageSize); loadPromotions()">末页</span>
      </div>
    </a-card>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { IconSearch, IconRefresh } from '@arco-design/web-vue/es/icon'
import { getPromotions, deletePromotion, lockPromotion, unlockPromotion } from '../api'
import { formatDateTime } from '../utils/date'

export default {
  name: 'PromotionList',
  components: { IconSearch, IconRefresh },
  setup() {
    const router = useRouter()
    const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    const promotions = ref([])
    const loading = ref(false)
    const searchTitle = ref('')
    const filterStatus = ref('')
    const filterLocked = ref('')
    const page = ref(1)
    const pageSize = ref(10)
    const totalCount = ref(0)

    const columns = [
      { title: '标题', dataIndex: 'title', slotName: 'title', width: 200 },
      { title: '状态', dataIndex: 'status', slotName: 'status', width: 100 },
      { title: '锁定', dataIndex: 'locked', slotName: 'locked', width: 100 },
      { title: '报名', dataIndex: 'enable_signup', slotName: 'enable_signup', width: 80 },
      { title: '创建时间', dataIndex: 'created_at', slotName: 'created_at', width: 160 },
      { title: '操作', slotName: 'action', width: 180 }
    ]

    const loadPromotions = async () => {
      loading.value = true
      try {
        const params = {
          page: page.value,
          page_size: pageSize.value
        }
        if (searchTitle.value) params.title = searchTitle.value
        if (filterStatus.value) params.status = filterStatus.value
        if (filterLocked.value) params.locked = filterLocked.value === 'locked'
        const res = await getPromotions(params)
        promotions.value = res.data?.list || res.data || []
        totalCount.value = res.data?.total || promotions.value.length
      } catch (e) {
        Message.error('加载宣传文案失败')
      } finally {
        loading.value = false
      }
    }

    const handleCreate = () => {
      router.push('/promotion/new')
    }

    const handleEdit = (record) => {
      router.push(`/promotion/${record.id}`)
    }

    const handleDelete = (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这条宣传文案吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deletePromotion(id)
            Message.success('删除成功')
            loadPromotions()
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    const handleToggleLock = async (record) => {
      try {
        if (record.locked) {
          await unlockPromotion(record.id)
          Message.success('解锁成功')
        } else {
          await lockPromotion(record.id)
          Message.success('锁定成功')
        }
        loadPromotions()
      } catch (e) {
        Message.error(e.message || '操作失败')
      }
    }

    const handleReset = () => {
      searchTitle.value = ''
      filterStatus.value = ''
      filterLocked.value = ''
      page.value = 1
      loadPromotions()
    }

    const handleKeydown = (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        handleCreate()
      }
    }

    onMounted(() => {
      loadPromotions()
      window.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeydown)
    })

    return {
      user,
      promotions,
      loading,
      searchTitle,
      filterStatus,
      filterLocked,
      page,
      pageSize,
      totalCount,
      columns,
      loadPromotions,
      handleCreate,
      handleEdit,
      handleDelete,
      handleToggleLock,
      handleReset,
      formatDateTime
    }
  }
}
</script>

<style scoped>
.page-view {
  animation: fadeIn 0.2s ease;
  max-width: 1400px;
  margin: 0 auto;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header-simple {
  margin-bottom: 16px;
}

.page-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
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

.toolbar-standard {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content-card {
  border-radius: var(--radius-lg);
}

.content-card :deep(.arco-card-body) {
  padding: 0;
}

:deep(.arco-card) {
  border-radius: var(--radius-lg);
  border: none;
  box-shadow: var(--shadow-card);
}

.title-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}

.tag-blue { background: #e6f0ff; color: #165dff; }
.tag-orange { background: #fff7e6; color: #ff7d00; }
.tag-green { background: #e6fff0; color: #00b42a; }
.tag-gray { background: #f5f5f5; color: #909399; }
.tag-red { background: #fff1f0; color: #f53f3f; }

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
</style>
