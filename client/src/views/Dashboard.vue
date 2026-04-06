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
      <nav class="sidebar-nav">
        <div class="nav-group">
          <div class="nav-group-title">考试服务</div>
          <div class="nav-item" :class="{ active: activeTab === 'questions' }" @click="switchTab('questions')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            <span>题库管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'papers' }" @click="switchTab('papers')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>试卷管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'screen' }" @click="switchTab('screen')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>考试数据</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'grading' }" @click="switchTab('grading')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>待评分</span>
            <span v-if="pendingGradingCount > 0" class="badge">{{ pendingGradingCount }}</span>
          </div>
        </div>
        <div v-if="user?.role === 'admin'" class="nav-group">
          <div class="nav-group-title">系统管理</div>
          <div class="nav-item" :class="{ active: activeTab === 'users' }" @click="switchTab('users')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>用户管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'announcements' }" @click="switchTab('announcements')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>公告管理</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'upgrade' }" @click="switchTab('upgrade')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>平台升级</span>
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
      <div v-show="activeTab === 'questions'" class="page-view">
        <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
        <div class="page-header-simple">
          <div class="page-header-content">
            <div class="page-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
              </svg>
            </div>
            <div class="page-header-text">
              <h1 class="page-title">题库管理</h1>
              <p class="page-desc">管理考试题目，支持单选、多选、判断等题型</p>
            </div>
          </div>
        </div>
        <div class="toolbar-standard">
          <div class="toolbar-left">
            <a-button type="primary" @click="showQuestionDialog = true">+ 新建题目</a-button>
            <a-button @click="showImportDialog = true">批量导入</a-button>
            <a-button @click="showCategoryDialog = true">类别管理</a-button>
            <div class="search-wrapper">
              <a-input v-model="questionSearch" placeholder="搜索题目内容..." style="width: 200px" @keyup.enter="questionPage = 1" allow-clear>
                <template #prefix><icon-search /></template>
              </a-input>
              <a-select v-model="searchType" placeholder="题型" style="width: 100px" @change="questionPage = 1" allow-clear>
                <a-option value="single">单选</a-option>
                <a-option value="multiple">多选</a-option>
                <a-option value="judge">判断</a-option>
                <a-option value="subjective">问答</a-option>
              </a-select>
              <a-select v-model="searchDifficulty" placeholder="难度" style="width: 100px" @change="questionPage = 1" allow-clear>
                <a-option value="easy">简单</a-option>
                <a-option value="medium">中等</a-option>
                <a-option value="hard">困难</a-option>
              </a-select>
              <a-button @click="resetSearch" v-if="questionSearch || searchType || searchDifficulty">
                <template #icon><icon-refresh /></template>
                重置
              </a-button>
            </div>
          </div>
        </div>
        <a-card class="content-card">
          <a-tabs v-model:active-key="activeCategory" @change="questionPage = 1">
            <a-tab-pane key="all" title="全部">
              <table class="data-table">
                <thead>
                  <tr>
                    <th width="60">ID</th>
                    <th>题目内容</th>
                    <th width="80">类型</th>
                    <th width="80">难度</th>
                    <th width="60">分值</th>
                    <th width="120">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(q, index) in paginatedQuestions" :key="q.id">
                    <td>{{ (questionPage - 1) * questionPageSize + index + 1 }}</td>
                    <td class="title-cell">{{ q.title }}</td>
                    <td>
                      <span v-if="q.type === 'single'" class="tag tag-blue">单选</span>
                      <span v-else-if="q.type === 'multiple'" class="tag tag-orange">多选</span>
                      <span v-else-if="q.type === 'judge'" class="tag tag-gray">判断</span>
                      <span v-else class="tag tag-green">问答</span>
                    </td>
                    <td>
                      <span v-if="q.difficulty === 'easy'" class="tag tag-green">简单</span>
                      <span v-else-if="q.difficulty === 'medium'" class="tag tag-orange">中等</span>
                      <span v-else class="tag tag-red">困难</span>
                    </td>
                    <td>{{ q.score }}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                        <a-link @click="editQuestion(q)">编辑</a-link>
                        <a-button type="text" status="danger" size="small" @click="deleteQuestion(q.id)">删除</a-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination" v-if="totalQuestionPages > 1">
                <span class="page-info">共 {{ filteredQuestions.length }} 条</span>
                <a-select v-model="questionPageSize" style="width: 80px" @change="questionPage = 1">
                  <a-option :value="10">10 条</a-option>
                  <a-option :value="15">15 条</a-option>
                  <a-option :value="20">20 条</a-option>
                  <a-option :value="50">50 条</a-option>
                </a-select>
                <span class="page-btn" @click="questionPage = 1">首页</span>
                <span class="page-btn" @click="questionPage > 1 && questionPage--">上一页</span>
                <span class="page-current">{{ questionPage }} / {{ totalQuestionPages }}</span>
                <span class="page-btn" @click="questionPage < totalQuestionPages && questionPage++">下一页</span>
                <span class="page-btn" @click="questionPage = totalQuestionPages">末页</span>
              </div>
            </a-tab-pane>
            <a-tab-pane v-for="c in categories" :key="String(c.id)" :title="c.name">
              <table class="data-table">
                <thead>
                  <tr>
                    <th width="60">ID</th>
                    <th>题目内容</th>
                    <th width="80">类型</th>
                    <th width="80">难度</th>
                    <th width="60">分值</th>
                    <th width="120">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(q, index) in paginatedQuestions" :key="q.id">
                    <td>{{ (questionPage - 1) * questionPageSize + index + 1 }}</td>
                    <td class="title-cell">{{ q.title }}</td>
                    <td>
                      <span v-if="q.type === 'single'" class="tag tag-blue">单选</span>
                      <span v-else-if="q.type === 'multiple'" class="tag tag-orange">多选</span>
                      <span v-else-if="q.type === 'judge'" class="tag tag-gray">判断</span>
                      <span v-else class="tag tag-green">问答</span>
                    </td>
                    <td>
                      <span v-if="q.difficulty === 'easy'" class="tag tag-green">简单</span>
                      <span v-else-if="q.difficulty === 'medium'" class="tag tag-orange">中等</span>
                      <span v-else class="tag tag-red">困难</span>
                    </td>
                    <td>{{ q.score }}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                        <a-link @click="editQuestion(q)">编辑</a-link>
                        <a-button type="text" status="danger" size="small" @click="deleteQuestion(q.id)">删除</a-button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination" v-if="totalQuestionPages > 1">
                <span class="page-info">共 {{ filteredQuestions.length }} 条</span>
                <a-select v-model="questionPageSize" style="width: 80px" @change="questionPage = 1">
                  <a-option :value="10">10 条</a-option>
                  <a-option :value="15">15 条</a-option>
                  <a-option :value="20">20 条</a-option>
                  <a-option :value="50">50 条</a-option>
                </a-select>
                <span class="page-btn" @click="questionPage = 1">首页</span>
                <span class="page-btn" @click="questionPage > 1 && questionPage--">上一页</span>
                <span class="page-current">{{ questionPage }} / {{ totalQuestionPages }}</span>
                <span class="page-btn" @click="questionPage < totalQuestionPages && questionPage++">下一页</span>
                <span class="page-btn" @click="questionPage = totalQuestionPages">末页</span>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </div>

      <div v-show="activeTab === 'papers'" class="page-view">
        <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
        <div class="page-header-simple">
          <div class="page-header-content">
            <div class="page-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="page-header-text">
              <h1 class="page-title">试卷管理</h1>
              <p class="page-desc">创建和管理考试试卷，支持手动选题和随机组卷</p>
            </div>
          </div>
        </div>
        <div class="toolbar-standard">
          <div class="toolbar-left">
            <a-button type="primary" @click="showPaperDialog = true">+ 新建试卷</a-button>
            <a-button @click="showRandomDialog = true">随机组卷</a-button>
          </div>
        </div>
        <a-card class="content-card">
          <div style="padding: 16px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th width="60">ID</th>
                  <th>试卷标题</th>
                  <th width="80">总分</th>
                  <th width="80">时限</th>
                  <th width="80">状态</th>
                  <th width="100">考生范围</th>
                  <th width="100">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, index) in paginatedPapers" :key="p.id">
                  <td>{{ (papersPage - 1) * papersPageSize + index + 1 }}</td>
                  <td class="title-cell">
                    <a-badge v-if="papersWithPendingGrading && papersWithPendingGrading[p.id]" :count="papersWithPendingGrading[p.id]" :max-count="99" :number-style="{backgroundColor: '#f53f3f'}">
                      <span style="cursor: pointer" @click="switchTab('grading'); $nextTick(() => scrollToPaper(p.id))">{{ p.title }}</span>
                    </a-badge>
                    <span v-else>{{ p.title }}</span>
                  </td>
                  <td>{{ p.total_score || 0 }}分</td>
                  <td>{{ p.time_limit }}分钟</td>
                  <td>
                    <span v-if="p.status === 'published'" class="tag tag-green">已发布</span>
                    <span v-else class="tag tag-gray">草稿</span>
                  </td>
                  <td>
                    <span v-if="p.allow_all_users !== false" class="tag tag-green">开放</span>
                    <span v-else class="tag tag-orange">指定考生</span>
                  </td>
                  <td>
                    <div class="action-group">
                      <a-dropdown trigger="click" @click="togglePaperMenu(p)" :popup-visible="p._showMenu">
                        <a-button size="mini" type="text">
                          更多 <icon-down />
                        </a-button>
                        <template #content>
                          <a-doption @click="handlePaperCommand('questions', p); p._showMenu = false">题目管理</a-doption>
                          <a-doption v-if="p.status === 'published'" @click="handlePaperCommand('url', p); p._showMenu = false">考试地址</a-doption>
                          <a-doption v-if="p.status === 'published'" @click="handlePaperCommand('records', p); p._showMenu = false">查看记录</a-doption>
                          <a-doption v-if="p.status !== 'published' && p.question_count > 0" @click="handlePaperCommand('publish', p); p._showMenu = false">发布试卷</a-doption>
                          <a-doption v-if="p.status !== 'published' && (!p.question_count || p.question_count === 0)" disabled>发布试卷（暂无题目）</a-doption>
                          <a-doption v-if="p.status === 'published'" @click="handlePaperCommand('unpublish', p); p._showMenu = false">取消发布</a-doption>
                          <a-doption @click="handlePaperCommand('edit', p); p._showMenu = false">编辑试卷</a-doption>
                          <a-doption danger @click="handlePaperCommand('delete', p); p._showMenu = false">删除试卷</a-doption>
                        </template>
                      </a-dropdown>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="papers.length > papersPageSize" class="pagination">
              <a-select v-model="papersPageSize" style="width: 80px" @change="papersPage = 1">
                <a-option :value="8">8 条</a-option>
                <a-option :value="10">10 条</a-option>
                <a-option :value="15">15 条</a-option>
                <a-option :value="20">20 条</a-option>
              </a-select>
              <span class="page-btn" @click="papersPage = 1">首页</span>
              <span class="page-btn" @click="papersPage > 1 && papersPage--">上一页</span>
              <span class="page-current">{{ papersPage }} / {{ Math.ceil(papers.length / papersPageSize) }}</span>
              <span class="page-btn" @click="papersPage < Math.ceil(papers.length / papersPageSize) && papersPage++">下一页</span>
              <span class="page-btn" @click="papersPage = Math.ceil(papers.length / papersPageSize)">末页</span>
            </div>
          </div>
        </a-card>
      </div>

      <div v-show="activeTab === 'screen'" class="page-view">
        <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
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

      <div v-show="activeTab === 'users'" v-if="user?.role === 'admin'" class="page-view">
        <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
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
            <a-button type="primary" @click="showUserDialog = true; editingUser = null; userForm = { username: '', password: '', phone: '', role: 'trainer' }">+ 新建用户</a-button>
            <a-input v-model="userSearch" placeholder="搜索用户..." style="width: 180px" @input="loadUsers" allow-clear>
              <template #prefix><icon-search /></template>
            </a-input>
          </div>
        </div>
        <a-card class="content-card">
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
                    <a-button type="text" status="danger" size="small" @click="deleteUserApi(u.id)" :disabled="u.role === 'admin'">删除</a-button>
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
        </a-card>
      </div>

      <div v-show="activeTab === 'announcements'" v-if="user?.role === 'admin'" class="page-view">
        <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
        <div class="page-header-simple">
          <div class="page-header-content">
            <div class="page-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div class="page-header-text">
              <h1 class="page-title">公告管理</h1>
              <p class="page-desc">管理新闻公告，支持富文本和图片上传</p>
            </div>
          </div>
        </div>
        <div class="toolbar-standard">
          <div class="toolbar-left">
            <a-button type="primary" @click="openAnnouncementDialog()">+ 新建公告</a-button>
          </div>
        </div>
        <a-card class="content-card">
          <table class="data-table">
            <thead>
              <tr>
                <th width="60">序号</th>
                <th>标题</th>
                <th width="100">类型</th>
                <th width="100">状态</th>
                <th width="160">创建时间</th>
                <th width="150">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, index) in paginatedAnnouncements" :key="a.id">
                <td>{{ (announcementPage - 1) * announcementPageSize + index + 1 }}</td>
                <td class="title-cell">{{ a.title }}</td>
                <td>
                  <span v-if="a.type === 'notice'" class="tag tag-blue">通知</span>
                  <span v-else-if="a.type === 'news'" class="tag tag-green">新闻</span>
                  <span v-else class="tag tag-orange">公告</span>
                </td>
                <td>
                  <span :class="a.status === 'published' ? 'tag tag-green' : 'tag tag-gray'">{{ a.status === 'published' ? '已发布' : '草稿' }}</span>
                </td>
                <td>{{ a.created_at ? new Date(a.created_at).toLocaleString() : '-' }}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                    <a-link @click="openAnnouncementDialog(a)">编辑</a-link>
                    <a-button type="text" status="danger" size="small" @click="deleteAnnouncementAction(a.id)">删除</a-button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="announcements.length > announcementPageSize" class="pagination">
            <a-select v-model="announcementPageSize" style="width: 80px" @change="announcementPage = 1">
              <a-option :value="8">8 条</a-option>
              <a-option :value="10">10 条</a-option>
              <a-option :value="15">15 条</a-option>
              <a-option :value="20">20 条</a-option>
            </a-select>
            <span class="page-btn" @click="announcementPage = 1">首页</span>
            <span class="page-btn" @click="announcementPage > 1 && announcementPage--">上一页</span>
            <span class="page-current">{{ announcementPage }} / {{ Math.ceil(announcements.length / announcementPageSize) }}</span>
            <span class="page-btn" @click="announcementPage < Math.ceil(announcements.length / announcementPageSize) && announcementPage++">下一页</span>
            <span class="page-btn" @click="announcementPage = Math.ceil(announcements.length / announcementPageSize)">末页</span>
          </div>
        </a-card>
      </div>

      <!-- 待评分页面 - 完全参照试卷管理重写 -->
      <div v-show="activeTab === 'grading'" class="page-view">
        <div class="page-header-simple">
          <div class="page-header-content">
            <div class="page-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div class="page-header-text">
              <h1 class="page-title">待评分</h1>
              <p class="page-desc">对包含问答题的试卷进行手工评分，共 <span class="highlight">{{ pendingGradingCount }}</span> 份待处理</p>
            </div>
          </div>
        </div>
        <div class="toolbar-standard">
          <div class="toolbar-left">
            <a-input v-model="pendingGradingSearch" placeholder="搜索考生姓名" style="width: 240px" @input="filterPendingGrading" allow-clear>
              <template #prefix><icon-search /></template>
            </a-input>
            <a-select v-model="pendingGradingPaperFilter" placeholder="选择试卷" style="width: 200px" @change="filterPendingGrading" allow-clear>
              <a-option v-for="p in papers" :key="p.id" :value="p.id">{{ p.title }}</a-option>
            </a-select>
            <a-button @click="resetPendingGradingFilter" v-if="pendingGradingSearch || pendingGradingPaperFilter">
              <template #icon><icon-refresh /></template>
              重置
            </a-button>
          </div>
        </div>
        <a-card class="content-card">
          <table class="data-table">
            <thead>
              <tr>
                <th width="120">考生姓名</th>
                <th>试卷</th>
                <th width="100">客观题</th>
                <th width="100">问答题</th>
                <th width="160">提交时间</th>
                <th width="100">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredPendingGradingList" :key="record.id">
                <td>
                  <div style="display: flex; align-items: center;">
                    <a-avatar :size="32" :style="{ backgroundColor: getStudentAvatarColor(record.student_name) }" style="margin-right: 12px">
                      {{ record.student_name?.charAt(0) }}
                    </a-avatar>
                    <span style="color: var(--color-primary); font-weight: 500;">{{ record.student_name }}</span>
                  </div>
                </td>
                <td>{{ record.paper_title }}</td>
                <td>
                  <span v-if="record.objective_score !== null && record.objective_total !== null">
                    {{ record.objective_score }}/{{ record.objective_total }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>
                  <a-tag v-if="record.essay_questions && record.essay_questions.length > 0" color="arcoblue" size="small">
                    {{ record.essay_questions.length }} 道题
                  </a-tag>
                  <span v-else>-</span>
                </td>
                <td>
                  <span style="color: var(--text-secondary); font-size: 13px;">
                    <icon-clock-circle style="margin-right: 6px; opacity: 0.6; width: 14px; height: 14px;" />
                    {{ formatDateTime(record.end_time) }}
                  </span>
                </td>
                <td>
                  <a-button type="primary" size="small" @click="openGradingDrawer(record)">
                    评阅
                  </a-button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredPendingGradingList.length > 0" class="pagination">
            <a-select v-model="pendingGradingPageSize" style="width: 80px" @change="pendingGradingPage = 1">
              <a-option :value="8">8 条</a-option>
              <a-option :value="10">10 条</a-option>
              <a-option :value="15">15 条</a-option>
              <a-option :value="20">20 条</a-option>
            </a-select>
            <span class="page-btn" @click="pendingGradingPage = 1">首页</span>
            <span class="page-btn" @click="pendingGradingPage > 1 && pendingGradingPage--">上一页</span>
            <span class="page-current">{{ pendingGradingPage }} / {{ Math.ceil(filteredPendingGradingList.length / pendingGradingPageSize) }}</span>
            <span class="page-btn" @click="pendingGradingPage < Math.ceil(filteredPendingGradingList.length / pendingGradingPageSize) && pendingGradingPage++">下一页</span>
            <span class="page-btn" @click="pendingGradingPage = Math.ceil(filteredPendingGradingList.length / pendingGradingPageSize)">末页</span>
          </div>
        </a-card>
      </div>
    </main>

    <a-modal v-model:visible="showQuestionDialog" :title="editingQuestion ? '编辑题目' : '新建题目'" :width="640" @before-ok="saveQuestion" @cancel="showQuestionDialog = false" :ok-text="'保存'" :cancel-text="'取消'">
      <div class="question-form">
        <a-form :model="questionForm" layout="vertical">
          <a-form-item label="题目内容">
            <a-textarea v-model="questionForm.title" :rows="3" placeholder="请输入题目内容" />
          </a-form-item>
          <div class="form-row">
            <a-form-item label="题目类型">
              <a-select v-model="questionForm.type">
                <a-option value="single">单选题</a-option>
                <a-option value="multiple">多选题</a-option>
                <a-option value="judge">判断题</a-option>
                <a-option value="subjective">问答题</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="所属类别">
              <a-select v-model="questionForm.category_id" placeholder="选择类别（可选）" allow-clear>
                <a-option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="难度">
              <a-select v-model="questionForm.difficulty">
                <a-option value="easy">简单</a-option>
                <a-option value="medium">中等</a-option>
                <a-option value="hard">困难</a-option>
              </a-select>
            </a-form-item>
            <a-form-item label="分值">
              <a-input-number v-model="questionForm.score" :min="1" :max="100" />
            </a-form-item>
          </div>
          <template v-if="questionForm.type !== 'subjective'">
            <a-form-item label="选项" class="options-label">
              <div class="options-wrapper">
                <div class="options-list">
                  <div v-for="(opt, idx) in questionForm.options" :key="idx" class="option-item">
                    <a-tag class="option-key-tag">{{ opt.key }}</a-tag>
                    <a-input v-model="opt.value" placeholder="请输入选项内容" class="option-input" allow-clear />
                    <a-button type="text" status="danger" class="option-delete" @click="questionForm.options.splice(idx, 1)" v-if="questionForm.options.length > 2">
                      <icon-delete />
                    </a-button>
                  </div>
                </div>
                <a-button type="dashed" class="add-option-btn" @click="questionForm.options.push({ key: String.fromCharCode(65 + questionForm.options.length), value: '' })" v-if="questionForm.type !== 'subjective' && questionForm.options.length < 7">
                  <icon-plus />
                  添加选项
                </a-button>
              </div>
            </a-form-item>
            <a-form-item label="正确答案" class="answer-label">
              <a-select v-if="questionForm.type === 'single' || questionForm.type === 'judge'" v-model="questionForm.answer" placeholder="选择正确答案">
                <a-option v-for="opt in questionForm.options" :key="opt.key" :value="opt.key">{{ opt.key }} - {{ opt.value || '选项' + opt.key }}</a-option>
              </a-select>
              <a-select v-else v-model="questionForm.answer" multiple placeholder="多选请选择多个答案">
                <a-option v-for="opt in questionForm.options" :key="opt.key" :value="opt.key">{{ opt.key }} - {{ opt.value || '选项' + opt.key }}</a-option>
              </a-select>
            </a-form-item>
          </template>
          <a-form-item label="答案解析">
            <a-textarea v-model="questionForm.explanation" :rows="2" placeholder="可选，添加题目解析有助于学员理解" />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <a-modal v-model:visible="showPaperDialog" :title="editingPaper ? '编辑试卷' : '新建试卷'" :width="800" @before-ok="createNewPaper" @cancel="showPaperDialog = false" :ok-text="'保存'" :cancel-text="'取消'">
      <a-form :model="paperForm" layout="vertical">
        <a-form-item label="试卷标题" required>
          <a-input v-model="paperForm.title" placeholder="请输入试卷标题" />
        </a-form-item>
        <a-form-item label="试卷描述">
          <a-textarea v-model="paperForm.description" :rows="2" />
        </a-form-item>
        <a-form-item label="时间限制">
          <a-input-number v-model="paperForm.time_limit" :min="1" :max="300" />
          <span style="margin-left: 8px">分钟</span>
        </a-form-item>
        <a-form-item label="选项">
          <a-checkbox v-model="paperForm.shuffle">打乱题目顺序</a-checkbox>
          <a-checkbox v-model="paperForm.show_score">显示分数</a-checkbox>
          <a-checkbox v-model="paperForm.show_answer">显示答案</a-checkbox>
        </a-form-item>
        <a-form-item label="访问码">
          <a-input v-model="paperForm.access_code" placeholder="可选，设置访问码" />
        </a-form-item>
        <a-form-item label="IP限制">
          <a-select v-model="paperForm.ip_limit" placeholder="每个IP考试次数限制" style="width: 100%">
            <a-option :value="0">不限制</a-option>
            <a-option :value="1">每个IP只能考1次</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="考生范围">
          <a-checkbox v-model="paperForm.allow_all_users">开放给所有考生</a-checkbox>
          <span style="color: #888; font-size: 12px; margin-left: 8px">关闭则需要指定考生才能参加考试</span>
        </a-form-item>
        <a-form-item label="考试时间">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <a-date-picker v-model="paperForm.start_time" show-time format="YYYY-MM-DD HH:mm" placeholder="开始时间" style="width: 180px" />
            <span>至</span>
            <a-date-picker v-model="paperForm.end_time" show-time format="YYYY-MM-DD HH:mm" placeholder="结束时间" style="width: 180px" />
          </div>
          <span style="color: #888; font-size: 12px;">留空则不限制考试时间</span>
        </a-form-item>
        <a-form-item v-if="!paperForm.allow_all_users" label="指定考生">
          <div style="margin-bottom: 12px;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
              <a-button type="primary" size="small" @click="showStudentDialog = true">
                <template #icon><icon-plus /></template>
                添加考生
              </a-button>
              <a-button size="small" @click="showImportStudentDialog = true">
                <template #icon><icon-upload /></template>
                批量导入
              </a-button>
              <a-button size="small" @click="handleExportStudents" :disabled="paperStudents.length === 0">
                <template #icon><icon-download /></template>
                导出名单
              </a-button>
            </div>
            <div v-if="paperStudents.length > 0" style="border: 1px solid #e5e5e5; border-radius: 4px; overflow: hidden;">
              <div style="max-height: 200px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <thead style="position: sticky; top: 0; z-index: 1;">
                    <tr style="background: #f7f8fa;">
                      <th style="padding: 10px 8px; text-align: left; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5;">考生号</th>
                      <th style="padding: 10px 8px; text-align: left; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5;">姓名</th>
                      <th style="padding: 10px 8px; text-align: left; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5;">手机</th>
                      <th style="padding: 10px 8px; text-align: center; font-weight: 500; color: #333; border-bottom: 1px solid #e5e5e5; width: 70px;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="student in paperStudents" :key="student.id">
                      <td style="padding: 10px 8px; color: #666; border-bottom: 1px solid #f0f0f0;">{{ student.student_no }}</td>
                      <td style="padding: 10px 8px; color: #333; border-bottom: 1px solid #f0f0f0;">{{ student.name }}</td>
                      <td style="padding: 10px 8px; color: #666; border-bottom: 1px solid #f0f0f0;">{{ student.phone || '-' }}</td>
                      <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                        <a-button type="text" status="danger" size="small" @click="removeStudentFromPaper(student.id)">移除</a-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else style="text-align: center; padding: 30px 20px; color: #999; background: #fafafa; border-radius: 4px; border: 1px dashed #ddd;">
              暂无考生，请添加或导入
            </div>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="showRandomDialog" title="随机组卷" :width="500" @before-ok="createRandomPaperAction" @cancel="showRandomDialog = false" :ok-text="'创建'" :cancel-text="'取消'">
      <a-form :model="randomForm" layout="vertical">
        <a-form-item label="试卷标题" required>
          <a-input v-model="randomForm.title" placeholder="请输入试卷标题" />
        </a-form-item>
        <a-form-item label="题目数量">
          <a-input-number v-model="randomForm.count" :min="1" :max="100" />
        </a-form-item>
        <a-form-item label="题目范围">
          <a-select v-model="randomForm.category_ids" multiple placeholder="选择类别（不选则从全部题目中抽取）">
            <a-option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="题目类型">
          <a-select v-model="randomForm.question_types" multiple placeholder="选择题目类型（不选则包含所有类型）">
            <a-option value="single">单选题</a-option>
            <a-option value="multiple">多选题</a-option>
            <a-option value="judge">判断题</a-option>
            <a-option value="subjective">问答题</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间限制">
          <a-input-number v-model="randomForm.time_limit" :min="1" :max="300" />
          <span style="margin-left: 8px">分钟</span>
        </a-form-item>
      </a-form>
    </a-modal>

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

    <a-modal v-model:visible="showExamUrlDialog" title="考试地址" :width="360" @cancel="showExamUrlDialog = false" :footer="null">
      <div v-if="examUrlData.access_url" class="exam-url-content">
        <p class="url-tip">考生扫描二维码或复制链接参加考试</p>
        <div class="qr-wrapper">
          <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(examUrlData.access_url)" alt="QR Code" />
        </div>
        <a-input :model-value="examUrlData.access_url" readonly style="width: 100%">
          <template #append>
            <a-button @click="copyUrl">复制</a-button>
          </template>
        </a-input>
      </div>
      <a-empty v-else description="暂无考试地址" />
    </a-modal>

    <a-modal v-model:visible="showRecordsDialog" title="考试记录" :width="900" @cancel="showRecordsDialog = false">
      <div v-if="examRecordsStats" style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <span style="margin-right: 24px">平均分：<strong>{{ examRecordsStats.avg_score ?? '-' }}</strong></span>
        <span style="margin-right: 24px">最高分：<strong>{{ examRecordsStats.max_score ?? '-' }}</strong></span>
        <span>总计：<strong>{{ examRecordsStats.total }}</strong> 人</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>学员</th>
            <th width="80">分数</th>
            <th width="100">状态</th>
            <th width="160">交卷时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in examRecords" :key="r.id">
            <td>{{ r.student_name }}</td>
            <td>{{ r.percentage ?? '-' }}%</td>
            <td>
              <span v-if="r.status === 'submitted'" class="tag tag-green">已提交</span>
              <span v-else-if="r.status === 'graded'" class="tag tag-blue">已评分</span>
              <span v-else class="tag tag-gray">进行中</span>
            </td>
            <td>{{ r.end_time ? new Date(r.end_time).toLocaleString() : '-' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="examRecordsPagination && examRecordsPagination.totalPages > 1" style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #666">共 {{ examRecordsPagination.total }} 条</span>
        <a-pagination
          v-model:current="examRecordsPage"
          :total="examRecordsPagination.total"
          :page-size="examRecordsPagination.pageSize"
          size="small"
          @change="handleExamRecordsPageChange"
        />
      </div>
    </a-modal>

    <a-modal v-model:visible="showImportDialog" title="批量导入题目" :width="600" @cancel="showImportDialog = false" :footer="null">
      <div style="padding: 20px 0">
        <a-alert type="info" style="margin-bottom: 16px">
          <template #title>
            <span style="font-weight: 600">导入说明</span>
          </template>
          <div style="font-size: 13px; line-height: 1.8">
            <div><strong>题型说明：</strong></div>
            <div style="margin-left: 12px; margin-bottom: 8px">
              • single - 单选题（需要填写选项A-D和正确答案）<br>
              • multiple - 多选题（多个正确答案用无间隔字符连接，如"AC"）<br>
              • judge - 判断题（正确答案填写 true 或 false）<br>
              • subjective - 问答题（只需填写题目内容和分值）
            </div>
            <div><strong>难度等级：</strong>easy（简单）/ medium（中等）/ hard（困难）</div>
            <div><strong>注意事项：</strong></div>
            <div style="margin-left: 12px">
              • 类别名称需与系统中已存在的类别匹配<br>
              • 多选题正确答案格式：如同时选A和C，填写"AC"<br>
              • 判断题正确答案为 true（正确）或 false（错误）<br>
              • Excel中请勿合并单元格，保持数据格式整洁
            </div>
          </div>
        </a-alert>
        
        <div style="display: flex; gap: 12px; margin-bottom: 20px">
          <a-button @click="downloadTemplate">
            <template #icon><icon-download /></template>
            下载模板
          </a-button>
          <a-upload :custom-request="handleImportQuestions" :show-file-list="false" accept=".xlsx,.xls">
            <a-button type="primary">
              <template #icon><icon-upload /></template>
              选择 Excel 文件
            </a-button>
          </a-upload>
        </div>
        
        <div v-if="importResult" :class="['import-result', importResult.success ? 'import-success' : 'import-error']">
          <a-result :status="importResult.success ? 'success' : 'error'" :title="importResult.title" :sub-title="importResult.subtitle">
            <template #extra>
              <a-space>
                <a-button @click="importResult = null">关闭</a-button>
                <a-button type="primary" @click="showImportDialog = false; loadQuestions()">查看题库</a-button>
              </a-space>
            </template>
          </a-result>
        </div>
        
        <div v-if="importing" style="text-align: center; padding: 40px 0">
          <a-spin tip="导入中，请稍候..." />
        </div>
      </div>
    </a-modal>

    <a-modal v-model:visible="showCategoryDialog" title="类别管理" :width="500" @cancel="showCategoryDialog = false" :footer="null">
      <div style="margin-bottom: 16px;">
        <a-input v-model="newCategoryName" placeholder="输入新类别名称" style="width: 200px; margin-right: 8px;" />
        <a-button type="primary" size="small" @click="handleAddCategory">添加</a-button>
      </div>
      <div v-if="categories.length > 0">
        <div v-for="cat in categories" :key="cat.id" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #f0f0f0;">
          <span>{{ cat.name }}</span>
          <a-button type="text" status="danger" size="small" @click="handleDeleteCategory(cat.id)">删除</a-button>
        </div>
      </div>
      <div v-else style="text-align: center; padding: 30px; color: #999;">
        暂无类别
      </div>
    </a-modal>

    <a-modal v-model:visible="showStudentDialog" title="添加考生" :width="500" @before-ok="addStudent" @cancel="showStudentDialog = false" :ok-text="'添加'" :cancel-text="'取消'">
      <a-form :model="studentForm" layout="vertical">
        <a-form-item label="考生姓名" required>
          <a-input v-model="studentForm.name" placeholder="请输入考生姓名" />
        </a-form-item>
        <a-form-item label="手机号码">
          <a-input v-model="studentForm.phone" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:visible="showImportStudentDialog" title="批量导入考生" :width="500" @cancel="showImportStudentDialog = false" :footer="null">
      <div style="text-align: center; padding: 20px 0">
        <a-upload :custom-request="handleImportStudents" :show-file-list="false" accept=".xlsx,.xls">
          <a-button type="primary">
            <template #icon><icon-upload /></template>
            选择Excel文件
          </a-button>
        </a-upload>
        <p style="color: var(--text-secondary); font-size: 13px; margin-top: 12px">
          Excel格式：考生姓名（必填）、考生手机（可选）
        </p>
        <p style="color: var(--text-secondary); font-size: 12px">
          支持 .xlsx 和 .xls 文件
        </p>
      </div>
    </a-modal>

    <div class="footer">
      <span>© thishe.com</span>
      <a-tag size="small" color="arcoblue">v{{ currentVersion }}</a-tag>
    </div>

    <a-drawer v-model:visible="showGradingDrawer" :title="'评卷 - ' + (currentGradingRecord?.student_name || '') + ' - ' + (currentGradingRecord?.paper_title || '')" :width="800" :footer="false">
      <div v-if="currentGradingRecord" class="grading-drawer-content">
        <div class="grading-drawer-header">
          <div class="header-info">
            <a-avatar :size="48" :style="{ backgroundColor: '#165DFF' }">
              {{ currentGradingRecord.student_name?.charAt(0) }}
            </a-avatar>
            <div class="header-meta">
              <div class="meta-row">
                <span class="meta-label">考生：</span>
                <span class="meta-value">{{ currentGradingRecord.student_name }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">试卷：</span>
                <span class="meta-value">{{ currentGradingRecord.paper_title }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">提交时间：</span>
                <span class="meta-value">{{ formatDateTime(currentGradingRecord.end_time) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">客观题得分：</span>
                <span class="meta-value score-highlight">
                  <template v-if="currentGradingRecord.objective_total !== null && currentGradingRecord.objective_total !== 0">
                    {{ currentGradingRecord.objective_score !== null ? currentGradingRecord.objective_score + '/' + currentGradingRecord.objective_total + '分' : '未评分' }}
                  </template>
                  <template v-else>
                    无客观题
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <a-divider style="margin: 16px 0" />
        
        <div class="grading-drawer-body">
          <div v-if="!currentGradingRecord || !currentGradingRecord.essay_questions || currentGradingRecord.essay_questions.length === 0" style="text-align: center; padding: 40px 0; color: var(--text-secondary)">
            <p>该考生没有问答题</p>
          </div>
          <div v-else>
            <div v-for="(eq, idx) in currentGradingRecord.essay_questions" :key="eq.question_id" class="grading-drawer-item">
              <div class="item-header">
                <div class="item-index">题目 {{ idx + 1 }}</div>
                <a-tag color="arcoblue">满分 {{ eq.max_score }}分</a-tag>
              </div>
              <div class="item-content">
                <div class="question-title">{{ eq.title }}</div>
                <div class="answer-section">
                  <div class="answer-label">
                    <icon-user /> 考生答案
                  </div>
                  <div class="answer-text">{{ eq.user_answer || '(未作答)' }}</div>
                </div>
                <div class="score-section">
                  <a-input-number v-model="eq.currentScore" :min="0" :max="eq.max_score" :step="1" style="width: 120px" placeholder="评分" />
                  <span class="score-unit">分</span>
                  <a-input v-model="eq.remark" placeholder="评语 (可选)" style="width: 200px; margin-left: 12px" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="grading-drawer-footer">
          <a-button @click="showGradingDrawer = false" style="margin-right: 8px">取消</a-button>
          <a-button type="primary" @click="submitEssayScore(currentGradingRecord)" :loading="submittingScore">
            提交评分
          </a-button>
        </div>
      </div>
    </a-drawer>

    <div v-show="activeTab === 'upgrade'" v-if="user?.role === 'admin'" class="page-view">
      <!-- 页面头部 - 使用 Arco 标准 PageHeader -->
      <div class="page-header-simple">
        <div class="page-header-content">
          <div class="page-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div class="page-header-text">
            <h1 class="page-title">平台升级</h1>
            <p class="page-desc">检查并更新系统到最新版本</p>
          </div>
        </div>
      </div>
      <a-card class="content-card">
        <div class="upgrade-info">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="当前版本">
              <a-tag color="arcoblue">v{{ upgradeInfo.currentVersion || currentVersion }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="最新版本">
              <a-tag :color="upgradeInfo.hasUpdate ? 'red' : 'green'">v{{ upgradeInfo.latestVersion || '-' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag v-if="upgradeInfo.hasUpdate" color="orange">发现新版本</a-tag>
              <a-tag v-else color="green">已是最新版本</a-tag>
            </a-descriptions-item>
          </a-descriptions>
          <div style="margin-top: 20px;">
            <a-button type="primary" :loading="checkingUpgrade" @click="checkForUpgrade">
              <template #icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></template>
              检查更新
            </a-button>
            <a-button v-if="upgradeInfo.hasUpdate" type="primary" status="warning" :loading="upgrading" @click="performUpgrade" style="margin-left: 12px;">
              升级到 v{{ upgradeInfo.latestVersion }}
            </a-button>
          </div>
          <a-alert v-if="upgradeMessage" :type="upgradeSuccess ? 'success' : 'error'" style="margin-top: 16px">{{ upgradeMessage }}</a-alert>
        </div>
      </a-card>
    </div>

    <a-modal v-model:visible="showAnnouncementDialog" :title="editingAnnouncement ? '编辑公告' : '新建公告'" :width="800" @cancel="showAnnouncementDialog = false" :footer="null">
      <a-form :model="announcementForm" layout="vertical">
        <a-form-item label="标题">
          <a-input v-model="announcementForm.title" placeholder="请输入公告标题" />
        </a-form-item>
        <a-form-item label="类型">
          <a-select v-model="announcementForm.type">
            <a-option label="通知" value="notice" />
            <a-option label="新闻" value="news" />
            <a-option label="公告" value="announcement" />
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="announcementForm.status">
            <a-option label="已发布" value="published" />
            <a-option label="草稿" value="draft" />
          </a-select>
        </a-form-item>
        <a-form-item label="内容">
          <div ref="editorContainerRef" class="rich-editor-wrapper"></div>
        </a-form-item>
      </a-form>
      <div style="text-align: right; margin-top: 16px">
        <a-button @click="showAnnouncementDialog = false">取消</a-button>
        <a-button type="primary" style="margin-left: 8px" @click="saveAnnouncement" :loading="savingAnnouncement">保存</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { io } from 'socket.io-client'
import E from 'wangeditor'
import * as XLSX from 'xlsx'
import {
  IconUser, IconDashboard, IconCheckCircle, IconTrophy,
  IconBarChart, IconRobot, IconDown, IconDelete, IconPlus, IconUpload, IconDownload,
  IconSearch, IconRefresh, IconClockCircle, IconFile, IconEdit
} from '@arco-design/web-vue/es/icon'
import {
  getQuestions, createQuestion, updateQuestion, deleteQuestion,
  getPapers, createPaper, updatePaper, deletePaper, publishPaper, unpublishPaper, createRandomPaper,
  getExamStats, getPaperExamUrl, getExamRecords,
  getUsers, createUser, updateUser, lockUser, deleteUser,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getPaperStudents, addPaperStudents, removePaperStudent, exportPaperStudents,
  getCategories, createCategory, deleteCategory,
  getPendingGrading, gradeEssay,
  checkUpgrade, doUpgrade
} from '@/api'
import { formatDateTime } from '@/utils/date'
import { APP_VERSION } from '@/version'

export default {
  name: 'Dashboard',
  setup() {
    const router = useRouter()
    const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
    const activeTab = ref('questions')
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
      console.log('[DEBUG] switchTab called:', tab)
      closeAllPaperMenus()
      activeTab.value = tab
      sidebarOpen.value = false
      if (tab === 'grading') {
        loadPendingGrading()
      } else if (tab === 'papers') {
        console.log('[DEBUG] Papers tab activated, calling loadPapers')
        loadPapers()
      } else if (tab === 'users') {
        console.log('[DEBUG] Users tab activated, calling loadUsers')
        loadUsers()
      } else if (tab === 'announcements') {
        console.log('[DEBUG] Announcements tab activated, calling loadAnnouncements')
        loadAnnouncements()
      }
    }

    const pendingGradingList = ref([])
    const showGradingDrawer = ref(false)
    const currentGradingRecord = ref(null)
    const submittingScore = ref(false)
    const pendingGradingSearch = ref('')
    const pendingGradingPaperFilter = ref(null)
    const pendingGradingPage = ref(1)
    const pendingGradingPageSize = ref(8)

    const filteredPendingGradingList = computed(() => {
      let result = pendingGradingList.value || []
      if (pendingGradingSearch.value) {
        const kw = pendingGradingSearch.value.toLowerCase()
        result = result.filter(r => (r.student_name || '').toLowerCase().includes(kw))
      }
      if (pendingGradingPaperFilter.value) {
        result = result.filter(r => r.paper_id === pendingGradingPaperFilter.value)
      }
      // 分页处理
      const startIndex = (pendingGradingPage.value - 1) * pendingGradingPageSize.value
      return result.slice(startIndex, startIndex + pendingGradingPageSize.value)
    })

    const handlePendingGradingPageChange = (page) => {
      pendingGradingPage.value = page
    }

    // 待评分数量
    const pendingGradingCount = computed(() => pendingGradingList.value?.length || 0)
    
    // 有待评分的试卷数量（用于 badge 显示）
    const papersWithPendingGrading = ref({})
    const pendingGradingColumns = [
      { title: '考生姓名', dataIndex: 'student_name', slotName: 'student_name', width: 120, align: 'left' },
      { title: '试卷', dataIndex: 'paper_title', slotName: 'paper_title', width: 200, align: 'left' },
      { title: '客观题', dataIndex: 'objective_score', slotName: 'objective_score', width: 100, align: 'center' },
      { title: '问答题', dataIndex: 'essay_count', slotName: 'essay_count', width: 100, align: 'center' },
      { title: '提交时间', dataIndex: 'end_time', slotName: 'end_time', width: 160, align: 'left' },
      { title: '操作', slotName: 'action', width: 100, align: 'left' }
    ]

    const loadPendingGrading = async () => {
      try {
        let allPending = []
        const pendingMap = {}
        for (const paper of papers.value) {
          try {
            const res = await getPendingGrading(paper.id)
            if (res.data && res.data.list) {
              if (res.data.list.length > 0) {
                pendingMap[paper.id] = res.data.list.length
              }
              for (const record of res.data.list) {
                record.paper_title = paper.title
                if (!record.essay_questions) record.essay_questions = []
                // 从题库中获取问答题的满分分数
                for (const eq of record.essay_questions) {
                  eq.currentScore = 0
                  eq.remark = ''
                  // 如果没有 max_score，从题库中查找
                  if (!eq.max_score) {
                    const question = questions.value.find(q => q.id === eq.question_id)
                    if (question && question.score) {
                      eq.max_score = question.score
                    } else {
                      eq.max_score = 0 // 默认值
                    }
                  }
                }
              }
              allPending = allPending.concat(res.data.list)
            }
          } catch (e) { console.error('加载待评分失败', e) }
        }
        pendingGradingList.value = allPending
        papersWithPendingGrading.value = pendingMap
      } catch (e) { console.error('加载待评分列表失败', e) }
    }

    const scrollToPaper = (paperId) => {
      const record = pendingGradingList.value.find(r => r.paper_id === paperId)
      if (record) {
        nextTick(() => {
          const el = document.querySelector(`[data-record-id="${record.id}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }
    }

    const submitEssayScore = async (record) => {
      try {
        // 检查是否有0分，如果有则确认
        const hasZeroScore = record.essay_questions.some(eq => eq.currentScore === 0);
        if (hasZeroScore) {
          // 使用 Modal.confirm 确认框
          const confirmed = await new Promise(resolve => {
            Modal.confirm({
              title: '确认提交',
              content: '有题目得分为0分，确定要提交吗？',
              okText: '确定提交',
              cancelText: '取消',
              onOk: () => resolve(true),
              onCancel: () => resolve(false)
            });
          });
          if (!confirmed) return; // 用户取消
        }
        
        const scores = record.essay_questions.map(eq => ({
          question_id: eq.question_id,
          score: eq.currentScore || 0,
          remark: eq.remark || ''
        }))
        
        // 调试：打印 Token 信息
        const cookieToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
        const localStorageToken = localStorage.getItem('token');
        const token = cookieToken || localStorageToken;
        
        console.log('=== 提交评分 ===');
        console.log('Cookie Token:', cookieToken ? '有' : '无');
        console.log('LocalStorage Token:', localStorageToken ? '有' : '无');
        
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Token 中的用户信息:', payload);
            console.log('角色:', payload.role);
            console.log('用户 ID:', payload.id);
            console.log('Token 过期时间:', new Date(payload.exp * 1000).toLocaleString());
          } catch (e) {
            console.log('Token 解析失败:', e.message);
          }
        } else {
          console.log('未找到 Token!');
        }
        
        const totalEssayScore = scores.reduce((sum, s) => sum + s.score, 0)
        const response = await gradeEssay({ exam_record_id: record.id, scores })
        Message.success('评分提交成功')

        if (currentGradingRecord.value && currentGradingRecord.value.id === record.id) {
          currentGradingRecord.value.essay_score = totalEssayScore
          currentGradingRecord.value.graded = true
        }

        showGradingDrawer.value = false
        loadPendingGrading()
      } catch (e) {
        const errorMsg = e.response?.data?.message || e.message || '评分提交失败'
        Message.error(errorMsg)
        console.error('评分提交失败详情:', e)
        console.error('e.response:', e.response)
        console.error('e.response?.data:', e.response?.data)
        // 如果是 403，打印详细用户信息帮助调试
        if (e.response?.status === 403) {
          const token = localStorage.getItem('token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.error('403 错误详情:');
            console.error('Token 中的角色:', payload.role);
            console.error('Token 中的用户 ID:', payload.id);
            console.error('Token 签发时间:', new Date(payload.iat * 1000).toLocaleString());
            console.error('Token 过期时间:', new Date(payload.exp * 1000).toLocaleString());
          }
        }
      }
    }
    
    const openGradingDrawer = (record) => {
      // 深拷贝记录，避免直接修改原数据
      const recordCopy = JSON.parse(JSON.stringify(record))
      
      // 初始化管理员评分和评语字段
      if (recordCopy.essay_questions && recordCopy.essay_questions.length > 0) {
        recordCopy.essay_questions.forEach(eq => {
          // 如果已经有评分则保留，否则初始化为 0
          if (eq.admin_score === undefined || eq.admin_score === null) {
            eq.currentScore = 0
          } else {
            eq.currentScore = eq.admin_score
          }
          // 初始化评语
          eq.remark = eq.remark || ''
        })
      }
      
      currentGradingRecord.value = recordCopy
      showGradingDrawer.value = true
    }
    
    const filterPendingGrading = () => {
      // 筛选逻辑已经在 computed 中实现
    }
    
    const resetPendingGradingFilter = () => {
      pendingGradingSearch.value = ''
      pendingGradingPaperFilter.value = null
    }

    // 生成考生头像颜色（基于姓名）
    const studentAvatarColors = ['#165DFF', '#00B42A', '#F77234', '#F53F3F', '#722ED1', '#3370FF', '#00B96B', '#FF7D00']
    const getStudentAvatarColor = (name) => {
      if (!name) return '#165DFF'
      const index = name.charCodeAt(0) % studentAvatarColors.length
      return studentAvatarColors[index]
    }

    const questions = ref([])
    const questionSearch = ref('')
    const searchType = ref('')
    const searchDifficulty = ref('')
    const activeCategory = ref('all')
    const questionPage = ref(1)
    const questionPageSize = ref(8)
    const showQuestionDialog = ref(false)
    const showImportDialog = ref(false)
    const showCategoryDialog = ref(false)
    const newCategoryName = ref('')
    const categories = ref([])
    const editingQuestion = ref(null)
    const questionForm = ref({
      title: '', type: 'single', difficulty: 'medium', score: 10,
      options: [{ key: 'A', value: '' }, { key: 'B', value: '' }], answer: '', explanation: '', category_id: null
    })
    
    // 批量导入相关
    const importing = ref(false)
    const importResult = ref(null)

    const papers = ref([])
    const papersPage = ref(1)
    const papersPageSize = ref(8)
    const showPaperDialog = ref(false)
    const showRandomDialog = ref(false)
    const editingPaper = ref(null)
    const randomForm = ref({ title: '', count: 10, time_limit: 60, category_ids: [], question_types: [] })
    const paperForm = ref({ title: '', description: '', time_limit: 60, shuffle: false, show_score: true, show_answer: true, access_code: '', ip_limit: 0, allow_all_users: true, start_time: null, end_time: null })
    const selectedQuestionIds = ref([])
    const selectedQuestions = ref([])

    const showStudentDialog = ref(false)
    const showImportStudentDialog = ref(false)
    const studentForm = ref({ name: '', phone: '' })
    const paperStudents = ref([])

    const selectedPaper = ref(null)
    const stats = ref({
      ranking: [],
      total_submitted: 0,
      pass_rate: 0,
      avg_score: 0,
      distribution: [],
      highest_score: 0
    })

    const showExamUrlDialog = ref(false)
    const examUrlData = ref({})

    const showRecordsDialog = ref(false)
    const examRecords = ref([])
    const examRecordsStats = ref(null)
    const examRecordsPagination = ref(null)
    const examRecordsPage = ref(1)
    const examRecordsCurrentPaperId = ref(null)

    // Socket.io 实时更新
    let socket = null
    const newEntryAnimation = ref(null)
    const newEntryKey = ref(0)

    const initSocket = () => {
      const wsUrl = 'http://localhost:3000'
      socket = io(wsUrl, { path: '/socket.io', transports: ['websocket', 'polling'] })

      socket.on('rank-update', (data) => {
        if (data.paper_id === selectedPaper.value) {
          const prevRanking = stats.value.ranking || []
          stats.value = {
            ...stats.value,
            ranking: Array.isArray(data.ranking) ? data.ranking : [],
            total_submitted: data.total_submitted
          }
          if (data.newEntry) {
            const prevRank = prevRanking.find(r => r.student_name === data.newEntry.student_name)?.rank
            if (!prevRank || prevRank > data.newEntry.rank) {
              newEntryAnimation.value = data.newEntry
              newEntryKey.value++
              setTimeout(() => { newEntryAnimation.value = null }, 3000)
            }
          }
        }
      })

      socket.on('disconnect', () => {
      })

      socket.on('pending-essay-grade', (data) => {
        if (data.paper_id) {
          papersWithPendingGrading.value[data.paper_id] = (papersWithPendingGrading.value[data.paper_id] || 0) + 1
        }
        loadStats()
        Message.info(`收到待评分通知: ${data.student_name} 提交了 ${data.essay_count} 道问答题`)
      })
    }

    const joinPaperRoom = (paperId) => {
      if (socket) {
        socket.emit('join-paper', paperId)
        if (typeof paperId === 'string') {
          socket.emit('join-paper', parseInt(paperId))
        } else {
          const paper = papers.value.find(p => p.id === paperId)
          if (paper?.key_id) socket.emit('join-paper', paper.key_id)
        }
      }
    }

    const leavePaperRoom = (paperId) => {
      if (socket) {
        socket.emit('leave-paper', paperId)
        if (typeof paperId === 'string') {
          socket.emit('leave-paper', parseInt(paperId))
        } else {
          const paper = papers.value.find(p => p.id === paperId)
          if (paper?.key_id) socket.emit('leave-paper', paper.key_id)
        }
      }
    }

    const publishedPapers = computed(() => (papers.value || []).filter(p => p.status === 'published'))

    const paginatedPapers = computed(() => {
      const startIndex = (papersPage.value - 1) * papersPageSize.value
      return (papers.value || []).slice(startIndex, startIndex + papersPageSize.value)
    })

    const filteredQuestions = computed(() => {
      let result = questions.value || []
      // 按类别筛选
      if (activeCategory.value !== 'all') {
        result = result.filter(q => String(q.category_id) === activeCategory.value)
      }
      // 按搜索关键词筛选
      if (questionSearch.value) {
        const kw = questionSearch.value.toLowerCase()
        result = result.filter(q => q.title.toLowerCase().includes(kw))
      }
      // 按题型筛选
      if (searchType.value) {
        result = result.filter(q => q.type === searchType.value)
      }
      // 按难度筛选
      if (searchDifficulty.value) {
        result = result.filter(q => q.difficulty === searchDifficulty.value)
      }
      return result
    })

    const paginatedQuestions = computed(() => {
      const start = (questionPage.value - 1) * questionPageSize.value
      const end = start + questionPageSize.value
      return (filteredQuestions.value || []).slice(start, end)
    })

    const totalQuestionPages = computed(() => Math.ceil((filteredQuestions.value || []).length / questionPageSize.value) || 1)

    const loadQuestions = async () => {
      try {
        const res = await getQuestions({ limit: 100 });
        if (res.data) {
          questions.value = res.data.list || res.data.questions || []
        }
      } catch (e) {
        Message.error('加载题目失败')
      }
    }
    
    const resetSearch = () => {
      questionSearch.value = ''
      searchType.value = ''
      searchDifficulty.value = ''
      questionPage.value = 1
    }
    
    // 批量导入相关方法
    const downloadTemplate = () => {
      const ws_data = [
        ['题目内容', '题型', '选项A', '选项B', '选项C', '选项D', '正确答案', '难度', '分值', '答案解析', '类别名称'],
        ['【第一行是表头，请从第二行开始填写】', '', '', '', '', '', '', '', '', '', ''],
        ['示例-单选题：JavaScript是什么类型的编程语言？', 'single', '编译型语言', '解释型语言', '汇编语言', '机器语言', 'B', 'medium', '10', 'JavaScript是一门解释型语言，代码不需要编译直接由浏览器解释执行', '编程语言'],
        ['示例-多选题：以下哪些是前端框架？', 'multiple', 'Vue', 'Django', 'React', 'Spring', 'AC', 'easy', '15', 'Vue和React是主流前端框架，Django和Spring是后端框架', '编程语言'],
        ['示例-判断题：Python是一种解释型语言', 'judge', '', '', '', '', 'true', 'easy', '5', 'Python确实是一种解释型语言', '编程语言'],
        ['示例-问答题：请简述HTTP和HTTPS的区别', 'subjective', '', '', '', '', '', 'medium', '20', 'HTTPS = HTTP + SSL/TLS加密传输，HTTP端口80，HTTPS端口443', '计算机基础'],
        ['【题型填写规范】single=单选 multiple=多选 judge=判断 subjective=问答', '', '', '', '', '', '', '', '', '', ''],
        ['【难度填写规范】easy=简单 medium=中等 hard=困难', '', '', '', '', '', '', '', '', '', ''],
        ['【多选题正确答案】如同时选AC则填写"AC"，同时选BCD则填写"BCD"（无间隔）', '', '', '', '', '', '', '', '', '', ''],
        ['【判断题正确答案】正确填写"true"，错误填写"false"', '', '', '', '', '', '', '', '', '', '']
      ]
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(ws_data)
      ws['!cols'] = [
        { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 35 }, { wch: 15 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, '题目导入模板')
      XLSX.writeFile(wb, '题目导入模板.xlsx')
    }
    
    const handleImportQuestions = async (options) => {
      const file = options.fileItem.file
      console.log('file:', file)
      importing.value = true
      importResult.value = null

      try {
        if (!file) {
          throw new Error('无法读取文件，请选择有效的Excel文件')
        }
        const arrayBuffer = await file.arrayBuffer()
        const data = new Uint8Array(arrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

        const questionsData = jsonData.slice(1).filter(row => row[0] && row[0].toString().trim())

        if (questionsData.length === 0) {
          throw new Error('Excel 中没有有效的题目数据')
        }

        const questionsToImport = questionsData.map((row) => {
          const typeMap = { 'single': 'single', 'multiple': 'multiple', 'judge': 'judge', 'true/false': 'judge', 'subjective': 'subjective' }
          const difficultyMap = { 'easy': 'easy', 'medium': 'medium', 'hard': 'hard', '简单': 'easy', '中等': 'medium', '困难': 'hard' }

          let options = []
          if (row[1] === 'single' || row[1] === 'multiple') {
            options = [
              { key: 'A', value: row[2] || '' },
              { key: 'B', value: row[3] || '' },
              { key: 'C', value: row[4] || '' },
              { key: 'D', value: row[5] || '' }
            ].filter(opt => opt.value)
          }

          let answer = row[6] || ''
          if (row[1] === 'judge') {
            answer = (answer === 'true' || answer === '正确' || answer === 'T') ? 'true' : 'false'
          }

          return {
            title: row[0]?.toString() || '',
            type: typeMap[row[1]?.toString().toLowerCase()] || 'single',
            options: options,
            answer: answer,
            difficulty: difficultyMap[row[7]?.toString().toLowerCase()] || 'medium',
            score: parseInt(row[8]) || 10,
            explanation: row[9] || '',
            category_name: row[10]?.toString() || ''
          }
        })

        let successCount = 0
        let failCount = 0
        const errors = []

        for (const q of questionsToImport) {
          try {
            const postData = {
              title: q.title,
              type: q.type,
              options: q.options,
              answer: q.answer,
              difficulty: q.difficulty,
              score: q.score,
              explanation: q.explanation,
              status: 'draft'
            }

            await createQuestion(postData)
            successCount++
          } catch (e) {
            failCount++
            errors.push(`题目"${q.title.substring(0, 20)}..."导入失败：${e.message}`)
          }
        }

        importResult.value = {
          success: successCount > 0,
          title: successCount > 0 ? `成功导入${successCount}道题目` : '导入失败',
          subtitle: failCount > 0 ? `失败${failCount}道` + (errors.length > 0 ? `\n${errors.slice(0, 3).join('\n')}` : '') : '所有题目已成功导入到题库'
        }
      } catch (e) {
        console.error('导入失败:', e)
        importResult.value = {
          success: false,
          title: '导入失败',
          subtitle: e.message || '文件解析失败，请检查文件格式是否正确'
        }
      } finally {
        importing.value = false
        options.onSuccess && options.onSuccess()
      }
    }

    const loadCategories = async () => {
      try {
        const res = await getCategories()
        if (res.data) {
          categories.value = res.data
        }
      } catch (e) {
        console.error('加载类别失败', e)
      }
    }

    const handleAddCategory = async () => {
      if (!newCategoryName.value.trim()) {
        Message.warning('请输入类别名称')
        return
      }
      try {
        await createCategory({ name: newCategoryName.value.trim() })
        Message.success('添加成功')
        newCategoryName.value = ''
        loadCategories()
      } catch (e) {
        Message.error('添加失败')
      }
    }

    const handleDeleteCategory = async (id) => {
      try {
        await deleteCategory(id)
        Message.success('删除成功')
        loadCategories()
      } catch (e) {
        Message.error('删除失败')
      }
    }

    const userList = ref([])
    const userPage = ref(1)
    const userPageSize = ref(8)
    const userLoading = ref(false)
    const userSearch = ref('')
    const showUserDialog = ref(false)
    const editingUser = ref(null)
    const userForm = ref({ username: '', password: '', phone: '', role: 'trainer' })

    const announcements = ref([])
    const announcementPage = ref(1)
    const announcementPageSize = ref(8)

    const paginatedAnnouncements = computed(() => {
      const startIndex = (announcementPage.value - 1) * announcementPageSize.value
      return (announcements.value || []).slice(startIndex, startIndex + announcementPageSize.value)
    })

    const showAnnouncementDialog = ref(false)
    const editingAnnouncement = ref(null)
    const announcementForm = ref({ title: '', content: '', type: 'notice', status: 'published' })
    const savingAnnouncement = ref(false)
    const editorContainerRef = ref(null)
    let editorInstance = null

    const loadUsers = async () => {
      userLoading.value = true
      try {
        const res = await getUsers({ keyword: userSearch.value })
        userList.value = res.data?.list || res.data?.users || []
      } catch (e) {
        console.error(e)
      } finally {
        userLoading.value = false
      }
    }

    const paginatedUserList = computed(() => {
      const startIndex = (userPage.value - 1) * userPageSize.value
      return (userList.value || []).slice(startIndex, startIndex + userPageSize.value)
    })

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

    const deleteUserApi = async (id) => {
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

    const loadAnnouncements = async () => {
      try {
        const res = await getAnnouncements()
        announcements.value = res.data?.list || res.data || []
      } catch (e) {
        console.error(e)
      }
    }

    const openAnnouncementDialog = (announcement = null) => {
      if (announcement) {
        editingAnnouncement.value = announcement
        announcementForm.value = {
          title: announcement.title,
          content: announcement.content,
          type: announcement.type,
          status: announcement.status
        }
      } else {
        editingAnnouncement.value = null
        announcementForm.value = { title: '', content: '', type: 'notice', status: 'published' }
      }
      showAnnouncementDialog.value = true
      nextTick(() => {
        if (editorInstance) {
          editorInstance.destroy()
          editorInstance = null
        }
        if (editorContainerRef.value) {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
          let ignoreNextChange = true
          editorInstance = new E(editorContainerRef.value)
          editorInstance.config.uploadImgServer = `${apiBase}/announcements/upload`
          editorInstance.config.uploadImgHeaders = {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
          editorInstance.config.uploadFileName = 'image'
          editorInstance.config.uploadImgHooks = {
            before: () => { Message.info('图片上传中...') },
            success: () => {},
            fail: (xhr) => {
              Message.error('图片上传失败')
              console.error('Upload failed:', xhr)
            },
            error: (xhr) => {
              Message.error('图片上传出错')
              console.error('Upload error:', xhr)
            },
            customInsert: (insertFn, result) => {
              if (result.success && result.url) {
                insertFn(result.url)
                Message.success('图片上传成功')
              } else {
                Message.error(result.message || '图片上传失败')
              }
            }
          }
          editorInstance.config.showLinkImg = false
          editorInstance.config.uploadImgMaxSize = 5 * 1024 * 1024
          editorInstance.config.uploadImgMaxLength = 10
          editorInstance.create()
          editorInstance.txt.html(announcementForm.value.content || '')
          editorInstance.onchange = () => {
            if (ignoreNextChange) {
              ignoreNextChange = false
              return
            }
            announcementForm.value.content = editorInstance.txt.html()
          }
        }
      })
    }

    const saveAnnouncement = async () => {
      if (!announcementForm.value.title) {
        Message.error('请输入公告标题')
        return
      }
      if (editorInstance) {
        announcementForm.value.content = editorInstance.txt.html()
      }
      savingAnnouncement.value = true
      try {
        if (editingAnnouncement.value) {
          await updateAnnouncement(editingAnnouncement.value.id, announcementForm.value)
          Message.success('更新成功')
        } else {
          await createAnnouncement(announcementForm.value)
          Message.success('创建成功')
        }
        showAnnouncementDialog.value = false
        loadAnnouncements()
      } catch (e) {
        Message.error(e.response?.data?.message || '操作失败')
      } finally {
        savingAnnouncement.value = false
      }
    }

    const deleteAnnouncementAction = (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除该公告吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deleteAnnouncement(id)
            Message.success('删除成功')
            loadAnnouncements()
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    const loadPapers = async () => {
      try {
        const res = await getPapers({ limit: 100 });
        if (res.data) {
          const paperList = res.data.list || res.data.papers || [];
          papers.value = paperList.map(p => ({ ...p, _showMenu: false }))
        }
      } catch (e) {
        console.error('加载试卷失败:', e)
        Message.error('加载试卷失败')
      }
    }

    const togglePaperMenu = (p) => {
      papers.value.forEach(item => {
        item._showMenu = item.id === p.id ? !item._showMenu : false
      })
    }

    const closeAllPaperMenus = () => {
      papers.value.forEach(item => {
        item._showMenu = false
      })
    }

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

    const saveQuestion = (done) => {
      (async () => {
        try {
          const data = { ...questionForm.value }
          if (data.type === 'multiple') {
            data.answer = data.answer.split(',').map(a => a.trim())
          }
          if (editingQuestion.value) {
            await updateQuestion(editingQuestion.value.id, data)
            Message.success('更新成功')
          } else {
            await createQuestion(data)
            Message.success('创建成功')
          }
          showQuestionDialog.value = false
          loadQuestions()
          done(true)
        } catch (e) {
          Message.error('操作失败')
          done(false)
        }
      })()
    }

    const editQuestion = (row) => {
      editingQuestion.value = row
      questionForm.value = {
        ...row,
        options: row.options || [{ key: 'A', value: '' }, { key: 'B', value: '' }]
      }
      showQuestionDialog.value = true
    }

    const deleteQuestionAction = async (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这道题吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deleteQuestion(id)
            Message.success('删除成功')
            loadQuestions()
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    const publishPaperAction = async (id) => {
      try {
        const res = await publishPaper(id)
        Message.success('发布成功')
        if (res.data?.access_url) {
          Modal.info({ title: '发布成功', content: `试卷已发布！访问链接: ${res.data.access_url}` })
        }
        loadPapers()
      } catch (e) {
        Message.error(e.response?.data?.message || '发布失败')
      }
    }

    const unpublishPaperAction = async (id) => {
      Modal.confirm({
        title: '取消发布确认',
        content: '确定要取消发布这份试卷吗？取消发布后考生将无法访问。',
        okText: '确定取消',
        cancelText: '暂不取消',
        type: 'warning',
        onOk: async () => {
          try {
            await unpublishPaper(id)
            Message.success('取消发布成功')
            loadPapers()
          } catch (e) {
            Message.error(e.message || '取消发布失败')
          }
        }
      })
    }

    const deletePaperAction = async (id) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这份试卷吗？此操作不可撤销。',
        okText: '确认删除',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          try {
            await deletePaper(id)
            Message.success('删除成功')
            loadPapers()
          } catch (e) {
            Message.error(e.message || '删除失败')
          }
        }
      })
    }

    const createRandomPaperAction = (done) => {
      (async () => {
        try {
          await createRandomPaper(randomForm.value)
          Message.success('创建成功')
          showRandomDialog.value = false
          loadPapers()
          done(true)
        } catch (e) {
          Message.error('创建失败: ' + (e.response?.data?.message || e.message))
          done(false)
        }
      })()
    }

    const createNewPaper = (done) => {
      (async () => {
        if (!paperForm.value.title) {
          Message.warning('请输入试卷标题')
          done(false)
          return
        }
        try {
          const data = { ...paperForm.value, question_ids: selectedQuestionIds.value }
          let paperId
          if (editingPaper.value) {
            await updatePaper(editingPaper.value.id, data)
            paperId = editingPaper.value.id
            Message.success('更新成功')
          } else {
            const res = await createPaper(data)
            paperId = res.data.id
            Message.success('创建成功')
          }
          if (!paperForm.value.allow_all_users && paperId) {
            const studentIds = paperStudents.value.map(s => s.id)
            if (studentIds.length > 0) {
              await addPaperStudents(paperId, studentIds)
            }
          }
          showPaperDialog.value = false
          editingPaper.value = null
          paperForm.value = { title: '', description: '', time_limit: 60, shuffle: false, show_score: true, show_answer: true, access_code: '', ip_limit: 0, allow_all_users: true }
          selectedQuestionIds.value = []
          selectedQuestions.value = []
          paperStudents.value = []
          loadPapers()
          done(true)
        } catch (e) {
          Message.error('操作失败: ' + (e.response?.data?.message || e.message))
          done(false)
        }
      })()
    }

    const addStudent = (done) => {
      (async () => {
        if (!studentForm.value.name) {
          Message.warning('请输入考生姓名')
          done(false)
          return
        }
        try {
          const res = await createStudent(studentForm.value)
          const newStudent = res.data
          paperStudents.value.push(newStudent)
          studentForm.value = { name: '', phone: '' }
          showStudentDialog.value = false
          Message.success('添加成功')
          done(true)
        } catch (e) {
          Message.error('添加失败: ' + (e.response?.data?.message || e.message))
          done(false)
        }
      })()
    }

    const removeStudentFromPaper = async (studentId) => {
      if (!editingPaper.value) return
      try {
        await removePaperStudent(editingPaper.value.id, studentId)
        paperStudents.value = paperStudents.value.filter(s => s.id !== studentId)
        Message.success('移除成功')
      } catch (e) {
        Message.error('移除失败')
      }
    }

    const handleExportStudents = async () => {
      if (!editingPaper.value) return
      try {
        const blob = await exportPaperStudents(editingPaper.value.id)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${editingPaper.value.title}_考生名单.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        Message.success('导出成功')
      } catch (e) {
        Message.error('导出失败')
      }
    }

    const handleImportStudents = async (options) => {
      const { file } = options
      try {
        const res = await importStudents(file)
        Message.success(res.message || '导入成功')
        showImportStudentDialog.value = false
        if (editingPaper.value) {
          const paperRes = await getPaperStudents(editingPaper.value.id)
          paperStudents.value = paperRes.data.map(ps => ps.student).filter(s => s)
        }
      } catch (e) {
        Message.error('导入失败: ' + (e.response?.data?.message || e.message))
      }
    }

    const editPaperAction = async (row) => {
      editingPaper.value = row
      paperForm.value = {
        title: row.title,
        description: row.description || '',
        time_limit: row.time_limit,
        shuffle: row.shuffle,
        show_score: row.show_score,
        show_answer: row.show_answer,
        access_code: row.access_code || '',
        allow_all_users: row.allow_all_users === true
      }
      selectedQuestionIds.value = []
      selectedQuestions.value = []
      if (!row.allow_all_users) {
        try {
          const res = await getPaperStudents(row.id)
          const mapped = res.data.map(ps => ps.student).filter(s => s)
          paperStudents.value = [...mapped]
        } catch (e) {
          console.error('获取考生列表失败:', e)
          paperStudents.value = []
        }
      } else {
        paperStudents.value = []
      }
      showPaperDialog.value = true
    }

    const viewExamUrl = async (id) => {
      try {
        const res = await getPaperExamUrl(id)
        examUrlData.value = res.data
        showExamUrlDialog.value = true
      } catch (e) { Message.error('获取考试地址失败') }
    }

    const manageQuestions = (id) => {
      router.push(`/paper/${id}/questions`)
    }

    const handlePaperCommand = (cmd, row) => {
      closeAllPaperMenus()
      switch (cmd) {
        case 'questions': manageQuestions(row.id); break
        case 'publish': publishPaperAction(row.id); break
        case 'unpublish': unpublishPaperAction(row.id); break
        case 'edit': editPaperAction(row); break
        case 'url': viewExamUrl(row.id); break
        case 'records': viewExamRecords(row.id); break
        case 'delete': deletePaperAction(row.id); break
      }
    }

    const copyUrl = async () => {
      try {
        await navigator.clipboard.writeText(examUrlData.value.access_url)
        Message.success('链接已复制到剪贴板')
      } catch (e) {
        const input = document.createElement('input')
        input.value = examUrlData.value.access_url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        Message.success('链接已复制到剪贴板')
      }
    }

    const viewExamRecords = async (id) => {
      examRecordsCurrentPaperId.value = id
      examRecordsPage.value = 1
      try {
        const res = await getExamRecords(id, { page: 1, pageSize: 10 })
        examRecords.value = res.data.list || []
        examRecordsStats.value = res.data.stats
        examRecordsPagination.value = {
          total: res.data.total,
          pageSize: res.data.pageSize,
          totalPages: res.data.totalPages
        }
        showRecordsDialog.value = true
      } catch (e) { Message.error('获取成绩失败') }
    }

    const handleExamRecordsPageChange = async (page) => {
      if (!examRecordsCurrentPaperId.value) return
      examRecordsPage.value = page
      try {
        const res = await getExamRecords(examRecordsCurrentPaperId.value, { page, pageSize: 10 })
        examRecords.value = res.data.list || []
        examRecordsPagination.value = {
          total: res.data.total,
          pageSize: res.data.pageSize,
          totalPages: res.data.totalPages
        }
      } catch (e) { Message.error('获取成绩失败') }
    }

    const handleLogout = () => {
      Modal.confirm({
        title: '退出确认',
        content: '确定要退出登录吗?',
        okText: '确定退出',
        cancelText: '取消',
        onOk: () => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('loggedIn')
          window.location.replace('/login')
        }
      })
    }

    const getDistBgColor = (range) => {
      const colors = { '90-100': '#52c41a', '80-89': '#1890ff', '70-79': '#fa8c16', '60-69': '#f5222d' }
      return colors[range] || '#8c8c8c'
    }

    const getAvatarColor = () => {
      const colors = ['#165DFF', '#0FC6C2', '#F53F3F', '#F7BA1E', '#722ED1', '#00B42A']
      const index = user.value?.username?.charCodeAt(0) % colors.length || 0
      return colors[index]
    }

    onMounted(async () => {
      loadQuestions()
      loadCategories()
      await loadPapers() // 等待 papers 加载完成
      if (user.value?.role === 'admin') {
        loadUsers()
        loadAnnouncements()
      }
      initSocket()
      // 加载待评分数据（用于侧边栏徽章）
      loadPendingGrading()
    })

    watch(() => showAnnouncementDialog.value, (val) => {
      if (!val && editorInstance) {
        editorInstance.destroy()
        editorInstance = null
      }
    })

    onUnmounted(() => {
      if (socket) socket.disconnect()
      if (editorInstance) {
        editorInstance.destroy()
        editorInstance = null
      }
    })

    return {
      userList, userSearch, userPage, userPageSize, showUserDialog, editingUser, userForm, userLoading, paginatedUserList,
      loadUsers, editUser, saveUser, toggleUserStatus, deleteUserApi,
      user, activeTab, switchTab, sidebarOpen, currentVersion, upgradeInfo, checkingUpgrade, upgrading, upgradeMessage, upgradeSuccess, checkForUpgrade, performUpgrade, questions, questionSearch, activeCategory, questionPage, questionPageSize, paginatedQuestions, filteredQuestions, totalQuestionPages,
      showQuestionDialog, showImportDialog,
      editingQuestion, questionForm, papers, papersPage, papersPageSize, showPaperDialog, showRandomDialog,
      randomForm, paperForm, selectedPaper, stats, publishedPapers, paginatedPapers,
      showExamUrlDialog, examUrlData,
      showRecordsDialog, examRecords, examRecordsStats, examRecordsPagination, examRecordsPage,
      handleExamRecordsPageChange,
      loadQuestions, loadPapers, loadStats, saveQuestion, editQuestion, deleteQuestion: deleteQuestionAction,
      publishPaper: publishPaperAction, deletePaper: deletePaperAction,
      createRandomPaperAction, createNewPaper, logout: handleLogout, viewExamUrl, copyUrl, viewExamRecords, editPaperAction, handlePaperCommand,
      togglePaperMenu, closeAllPaperMenus,
      getDistBgColor, formatDateTime, getAvatarColor, getStudentAvatarColor,
      IconUser, IconDashboard, IconCheckCircle, IconTrophy,
      IconBarChart, IconRobot, IconDown, IconDelete, IconPlus, IconUpload, IconDownload,
      newEntryAnimation, newEntryKey,
      announcements, announcementPage, announcementPageSize, showAnnouncementDialog, editingAnnouncement, announcementForm, savingAnnouncement, editorContainerRef, paginatedAnnouncements,
      openAnnouncementDialog, saveAnnouncement, deleteAnnouncementAction, loadAnnouncements,
      showStudentDialog, showImportStudentDialog, studentForm, paperStudents,
      addStudent, removeStudentFromPaper, handleImportStudents, handleExportStudents,
      showCategoryDialog, newCategoryName, categories, handleAddCategory, handleDeleteCategory,
      pendingGradingList, pendingGradingCount, submitEssayScore,
      editingPaper, papersWithPendingGrading,
      // 待评分抽屉
      showGradingDrawer, currentGradingRecord, submittingScore,
      pendingGradingSearch, pendingGradingPaperFilter, filteredPendingGradingList,
      pendingGradingPage, pendingGradingPageSize, handlePendingGradingPageChange,
      pendingGradingColumns, openGradingDrawer, filterPendingGrading, resetPendingGradingFilter, getStudentAvatarColor,
      // 批量导入
      importing, importResult, downloadTemplate, handleImportQuestions,
      // 高级搜索
      searchType, searchDifficulty, resetSearch,
      // 试卷相关
      scrollToPaper,
      // 图标组件
      IconUser, IconDashboard, IconCheckCircle, IconTrophy,
      IconBarChart, IconRobot, IconDown, IconDelete, IconPlus, IconUpload, IconDownload,
      IconSearch, IconRefresh, IconClockCircle, IconFile, IconEdit
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
  justify-content: flex-start;
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

.data-table { width: 100%; max-width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed; }
.data-table th, .data-table td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.data-table th {
  background: var(--bg-color);
  font-weight: 500;
  color: var(--text-regular);
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color-light);
  color: var(--text-primary);
}
.data-table tbody tr:hover { background: var(--bg-color-hover); }
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table .title-cell { max-width: 224px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.action-group { display: flex; gap: 8px; align-items: center; }

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

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background: var(--bg-color-white);
  border-radius: var(--radius-lg);
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

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-color);
  color: var(--text-secondary);
}

.rank-badge.gold { background: #fffbe6; color: #faad14; }
.rank-badge.silver { background: #f5f5f5; color: #8c8c8c; }
.rank-badge.bronze { background: #fff1f0; color: #fa8c16; }

.score-tag {
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
.score-tag.mid { background: #fff7e6; color: #fa8c16; }
.score-tag.low { background: #f5f5f5; color: #8c8c8c; }

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
