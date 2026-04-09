<template>
  <a-modal
    :visible="visible"
    @cancel="handleClose"
    :footer="null"
    :width="1000"
    :mask-closable="true"
    class="signup-list-dialog"
  >
    <template #title>
      <div class="dialog-header">
        <span>报名名单 - {{ promotion?.title }}</span>
        <a-button type="primary" @click="handleExport" :loading="exporting">
          <icon-download />
          导出Excel
        </a-button>
      </div>
    </template>

    <div class="signup-list-container">
      <!-- 统计信息 -->
      <div class="stats-section" v-if="stats">
        <a-row :gutter="16">
          <a-col :span="6">
            <div class="stat-item">
              <div class="stat-value">{{ stats.total || 0 }}</div>
              <div class="stat-label">总报名人数</div>
            </div>
          </a-col>
          <a-col :span="6" v-for="(count, name) in stats.class_stats" :key="name">
            <div class="stat-item">
              <div class="stat-value">{{ count }}</div>
              <div class="stat-label">{{ name }}</div>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 筛选工具栏 -->
      <div class="toolbar">
        <a-input-search
          v-model="searchKeyword"
          placeholder="搜索姓名或手机号"
          style="width: 250px"
          @search="handleSearch"
          allow-clear
        />
        <a-select
          v-model="filterClass"
          placeholder="筛选班次"
          style="width: 180px"
          allow-clear
          @change="handleSearch"
        >
          <a-option
            v-for="cls in promotion?.signup_config?.classes || []"
            :key="cls.id"
            :value="cls.id"
          >
            {{ cls.name }}
          </a-option>
        </a-select>
        <a-select
          v-model="filterStatus"
          placeholder="筛选状态"
          style="width: 120px"
          allow-clear
          @change="handleSearch"
        >
          <a-option value="pending">待审核</a-option>
          <a-option value="approved">已通过</a-option>
          <a-option value="rejected">已拒绝</a-option>
        </a-select>
        <a-button type="primary" @click="handleAdd">
          <icon-plus />
          手动添加
        </a-button>
      </div>

      <!-- 报名列表 -->
      <a-table
        :data="signups"
        :loading="loading"
        :pagination="pagination"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        size="small"
        class="signup-table"
      >
        <template #columns>
          <a-table-column title="序号" width="60" align="center">
            <template #cell="{ rowIndex }">
              {{ (pagination.current - 1) * pagination.pageSize + rowIndex + 1 }}
            </template>
          </a-table-column>
          <a-table-column title="姓名" data-index="name" width="100" />
          <a-table-column title="单位" data-index="unit" width="150">
            <template #cell="{ record }">
              {{ record.unit || '-' }}
            </template>
          </a-table-column>
          <a-table-column title="手机号" data-index="phone" width="130" />
          <a-table-column title="报名班次" data-index="class_name" width="150" />
          <a-table-column title="报名时间" data-index="created_at" width="160">
            <template #cell="{ record }">
              {{ formatDate(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column title="状态" width="100" align="center">
            <template #cell="{ record }">
              <a-tag :color="getStatusColor(record.status)">
                {{ getStatusText(record.status) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="来源" width="100" align="center">
            <template #cell="{ record }">
              <a-tag size="small" :color="record.source === 'online' ? 'blue' : 'green'">
                {{ record.source === 'online' ? '在线' : '手动' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" width="180" align="center" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  编辑
                </a-button>
                <a-dropdown>
                  <a-button type="text" size="small">
                    审核
                    <icon-down />
                  </a-button>
                  <template #content>
                    <a-doption @click="handleStatusChange(record, 'approved')">通过</a-doption>
                    <a-doption @click="handleStatusChange(record, 'rejected')">拒绝</a-doption>
                    <a-doption @click="handleStatusChange(record, 'pending')">设为待审核</a-doption>
                  </template>
                </a-dropdown>
                <a-popconfirm
                  content="确定删除此报名记录？"
                  type="warning"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>

    <!-- 添加/编辑弹窗 -->
    <a-modal
      v-model:visible="formVisible"
      :title="formTitle"
      @ok="handleFormSubmit"
      @cancel="formVisible = false"
      :width="500"
    >
      <a-form :model="formData" layout="vertical">
        <a-form-item label="姓名" required>
          <a-input v-model="formData.name" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="单位">
          <a-input v-model="formData.unit" placeholder="请输入单位（选填）" />
        </a-form-item>
        <a-form-item label="手机号" required>
          <a-input v-model="formData.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="报名班次" required>
          <a-select v-model="formData.class_id" placeholder="请选择班次">
            <a-option
              v-for="cls in promotion?.signup_config?.classes || []"
              :key="cls.id"
              :value="cls.id"
            >
              {{ cls.name }}
            </a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconDownload, IconPlus, IconDown } from '@arco-design/web-vue/es/icon'
import {
  getPromotionSignups,
  createPromotionSignupManual,
  updatePromotionSignup,
  deletePromotionSignup,
  updatePromotionSignupStatus,
  exportPromotionSignups
} from '@/api'

const props = defineProps({
  visible: Boolean,
  promotion: Object
})

const emit = defineEmits(['update:visible', 'refresh'])

const loading = ref(false)
const exporting = ref(false)
const signups = ref([])
const stats = ref(null)
const searchKeyword = ref('')
const filterClass = ref('')
const filterStatus = ref('')

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

const formVisible = ref(false)
const formTitle = ref('')
const formData = reactive({
  id: null,
  name: '',
  unit: '',
  phone: '',
  class_id: ''
})

const getStatusColor = (status) => {
  const colors = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red'
  }
  return colors[status] || 'gray'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchSignups = async () => {
  if (!props.promotion?.id) return
  
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      keyword: searchKeyword.value || undefined,
      class_id: filterClass.value || undefined,
      status: filterStatus.value || undefined
    }
    const res = await getPromotionSignups(props.promotion.id, params)
    if (res.success) {
      signups.value = res.data.list
      pagination.total = res.data.total
      stats.value = {
        total: res.data.total,
        class_stats: res.data.class_stats
      }
    }
  } catch (error) {
    Message.error('获取报名列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchSignups()
}

const handlePageChange = (page) => {
  pagination.current = page
  fetchSignups()
}

const handlePageSizeChange = (size) => {
  pagination.pageSize = size
  pagination.current = 1
  fetchSignups()
}

const handleExport = async () => {
  if (!props.promotion?.id) return
  
  exporting.value = true
  try {
    const res = await exportPromotionSignups(props.promotion.id)
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `报名名单-${props.promotion.title}-${Date.now()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    Message.success('导出成功')
  } catch (error) {
    Message.error('导出失败')
  } finally {
    exporting.value = false
  }
}

const handleAdd = () => {
  formTitle.value = '手动添加报名'
  formData.id = null
  formData.name = ''
  formData.unit = ''
  formData.phone = ''
  formData.class_id = ''
  formVisible.value = true
}

const handleEdit = (record) => {
  formTitle.value = '编辑报名信息'
  formData.id = record.id
  formData.name = record.name
  formData.unit = record.unit || ''
  formData.phone = record.phone
  formData.class_id = record.class_id
  formVisible.value = true
}

const handleFormSubmit = async () => {
  if (!formData.name || !formData.phone || !formData.class_id) {
    Message.warning('请填写必填项')
    return
  }

  const selectedClass = props.promotion?.signup_config?.classes?.find(c => c.id === formData.class_id)
  
  try {
    if (formData.id) {
      await updatePromotionSignup(props.promotion.id, formData.id, {
        ...formData,
        class_name: selectedClass?.name
      })
      Message.success('更新成功')
    } else {
      await createPromotionSignupManual(props.promotion.id, {
        ...formData,
        class_name: selectedClass?.name
      })
      Message.success('添加成功')
    }
    formVisible.value = false
    fetchSignups()
    emit('refresh')
  } catch (error) {
    Message.error(error.response?.data?.message || '操作失败')
  }
}

const handleStatusChange = async (record, status) => {
  try {
    await updatePromotionSignupStatus(props.promotion.id, record.id, status)
    Message.success('状态更新成功')
    fetchSignups()
    emit('refresh')
  } catch (error) {
    Message.error('状态更新失败')
  }
}

const handleDelete = async (record) => {
  try {
    await deletePromotionSignup(props.promotion.id, record.id)
    Message.success('删除成功')
    fetchSignups()
    emit('refresh')
  } catch (error) {
    Message.error('删除失败')
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (val) => {
  if (val && props.promotion?.id) {
    pagination.current = 1
    searchKeyword.value = ''
    filterClass.value = ''
    filterStatus.value = ''
    fetchSignups()
  }
})
</script>

<style scoped>
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 24px;
}

.signup-list-container {
  padding: 16px 0;
}

.stats-section {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--color-fill-2);
  border-radius: 8px;
}

.stat-item {
  text-align: center;
  padding: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 4px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.signup-table {
  margin-top: 8px;
}
</style>
