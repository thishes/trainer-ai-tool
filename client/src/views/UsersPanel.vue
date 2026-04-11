<template>
  <div class="page-view">
    <div class="page-header-simple">
      <div class="page-header-content">
        <div class="page-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="page-header-text">
          <h1 class="page-title">用户管理</h1>
          <p class="page-desc">管理系统用户和权限</p>
        </div>
      </div>
    </div>
    <div class="toolbar-standard">
      <div class="toolbar-left">
        <a-button type="primary" @click="openCreateDialog">+ 新建用户</a-button>
        <a-input v-model="userSearch" placeholder="搜索用户..." style="width: 180px" @input="debouncedLoadUsers" @clear="loadUsers" allow-clear>
          <template #prefix><icon-search /></template>
        </a-input>
      </div>
    </div>
    <a-card class="content-card">
      <template v-if="userListLoading">
        <a-skeleton :animation="true">
          <a-skeleton-line :widths="['100%', '80%', '60%', '70%']" :rows="5" />
        </a-skeleton>
      </template>
      <template v-else-if="paginatedUserList.length === 0">
        <a-empty description="暂无用户数据" />
      </template>
      <template v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th width="60">序号</th>
              <th>用户名</th>
              <th width="120">手机号</th>
              <th width="100">角色</th>
              <th width="80">状态</th>
              <th width="160">创建时间</th>
              <th width="180">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, index) in paginatedUserList" :key="u.id">
              <td>{{ (userPage - 1) * userPageSize + index + 1 }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.phone || '-' }}</td>
              <td>
                <span :class="u.role === 'admin' ? 'tag tag-red' : 'tag tag-blue'">{{ u.role === 'admin' ? '管理员' : '培训师' }}</span>
              </td>
              <td>
                <span :class="u.status === 'locked' ? 'tag tag-red' : 'tag tag-green'">{{ u.status === 'locked' ? '已锁定' : '正常' }}</span>
              </td>
              <td>{{ u.created_at ? new Date(u.created_at).toLocaleString() : '-' }}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                  <a-link @click="editUser(u)">编辑</a-link>
                  <a-switch :checked="u.status !== 'locked'" size="small" @change="toggleUserStatus(u)" :disabled="u.role === 'admin'" />
                  <a-button type="text" status="danger" size="small" @click="deleteUserAction(u.id)" :disabled="u.role === 'admin'">删除</a-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="userList.length > userPageSize" class="pagination">
          <a-select v-model="userPageSize" style="width: 80px" @change="userPage = 1">
            <a-option :value="8">8 条</a-option>
            <a-option :value="10">10 条</a-option>
            <a-option :value="15">15 条</a-option>
            <a-option :value="20">20 条</a-option>
          </a-select>
          <span class="page-btn" @click="userPage = 1">首页</span>
          <span class="page-btn" @click="userPage > 1 && userPage--">上一页</span>
          <span class="page-current">{{ userPage }} / {{ Math.ceil(userList.length / userPageSize) }}</span>
          <span class="page-btn" @click="userPage < Math.ceil(userList.length / userPageSize) && userPage++">下一页</span>
          <span class="page-btn" @click="userPage = Math.ceil(userList.length / userPageSize)">末页</span>
        </div>
      </template>
    </a-card>

    <!-- 新建/编辑用户弹窗 -->
    <a-modal v-model:visible="showUserDialog" :title="editingUser ? '编辑用户' : '新建用户'" :width="500" @before-ok="saveUser" @cancel="showUserDialog = false" :ok-text="'确定'" :cancel-text="'取消'">
      <a-form :model="userForm" layout="vertical">
        <a-form-item label="用户名">
          <a-input v-model="userForm.username" :disabled="!!editingUser" />
        </a-form-item>
        <a-form-item label="密码" v-if="!editingUser">
          <a-input-password v-model="userForm.password" />
        </a-form-item>
        <a-form-item v-else label="重置密码">
          <a-input-password v-model="userForm.password" placeholder="留空则不修改密码" />
        </a-form-item>
        <a-form-item label="手机号">
          <a-input v-model="userForm.phone" />
        </a-form-item>
        <a-form-item label="角色">
          <a-select v-model="userForm.role">
            <a-option label="培训师" value="trainer" />
            <a-option label="管理员" value="admin" />
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconSearch } from '@arco-design/web-vue/es/icon'
import { getUsers, createUser, updateUser, lockUser, deleteUser } from '@/api'

export default {
  name: 'UsersPanel',
  components: { IconSearch },
  setup() {
    const userList = ref([])
    const userListLoading = ref(false)
    const userPage = ref(1)
    const userPageSize = ref(8)
    const userSearch = ref('')
    const showUserDialog = ref(false)
    const editingUser = ref(null)
    const userForm = ref({ username: '', password: '', phone: '', role: 'trainer' })

    const paginatedUserList = computed(() => {
      const startIndex = (userPage.value - 1) * userPageSize.value
      return (userList.value || []).slice(startIndex, startIndex + userPageSize.value)
    })

    const loadUsers = async () => {
      userListLoading.value = true
      try {
        const res = await getUsers({ keyword: userSearch.value })
        userList.value = res.data?.list || res.data?.users || []
      } catch (e) {
        console.error(e)
        Message.error('加载用户失败: ' + (e.message || '网络错误'))
      } finally {
        userListLoading.value = false
      }
    }

    // 搜索防抖 300ms
    let searchTimer = null
    const debouncedLoadUsers = () => {
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        loadUsers()
      }, 300)
    }

    const openCreateDialog = () => {
      editingUser.value = null
      userForm.value = { username: '', password: '', phone: '', role: 'trainer' }
      showUserDialog.value = true
    }

    const editUser = (row) => {
      editingUser.value = row
      userForm.value = { username: row.username, phone: row.phone, role: row.role }
      showUserDialog.value = true
    }

    const saveUser = (done) => {
      (async () => {
        try {
          if (editingUser.value) {
            await updateUser(editingUser.value.id, userForm.value)
          } else {
            await createUser(userForm.value)
          }
          showUserDialog.value = false
          editingUser.value = null
          userForm.value = { username: '', password: '', phone: '', role: 'trainer' }
          loadUsers()
          Message.success('保存成功')
          done(true)
        } catch (e) {
          Message.error(e.message || '保存失败')
          done(false)
        }
      })()
    }

    const toggleUserStatus = async (row) => {
      try {
        const newStatus = row.status === 'locked' ? 'active' : 'locked'
        await lockUser(row.id, newStatus)
        row.status = newStatus
        Message.success(newStatus === 'locked' ? '已锁定' : '已解锁')
      } catch (e) {
        Message.error(e.message || '操作失败')
      }
    }

    const deleteUserAction = (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除该用户吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deleteUser(id)
            loadUsers()
            Message.success('删除成功')
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    onMounted(() => {
      loadUsers()
    })

    return {
      userList, userListLoading, userPage, userPageSize, userSearch,
      showUserDialog, editingUser, userForm, paginatedUserList,
      loadUsers, debouncedLoadUsers, openCreateDialog, editUser, saveUser,
      toggleUserStatus, deleteUserAction
    }
  }
}
</script>
