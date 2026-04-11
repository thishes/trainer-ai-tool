# 项目记忆

## 项目：培训师AI工具 (trainer-ai-tool)

### 技术栈
- 前端：Vue 3 + Arco Design + Vite + Pinia
- 后端：Node.js + Express
- 存储：JSON文件 + MySQL（双写）+ Redis缓存
- 实时：Socket.IO

### 2026-04-11 代码优化执行（第二阶段）
- 完成8个路由文件迁移到 repository.js 统一数据访问层
- 迁移文件：categories.js、announcements.js、users.js、questions.js、exam.js、papers.js、promotions.js、system.js
- 消除了约161处 mysqlDb 直接引用，路由代码不再关心底层数据源
- 3处保留 require('../db-mysql')：questions.js(高级SQL过滤)、papers.js(随机组卷SQL)、system.js(MySQL健康检查)
- repository.js 扩展了完整方法集：用户/分类/题目/试卷/考试记录/评分/公告/宣推/报名等
- 所有9个文件语法验证通过
- P0全部修复：数据库凭据保护(.gitignore + .env.example)、验证码改SVG图片、升级接口改execFile+版本号校验、JWT refresh限制过期1小时内
- P1全部修复：CSRF白名单缩减到8个必要路径、CORS改为函数验证、登录/注册/验证码路由加限流、v-html全部替换为SafeHtml组件(DOMPurify)
- 架构改进：创建repository.js统一数据访问层(消除if/else)、统一响应工具(response.js)、输入验证中间件(validate.js+Joi)、Pinia stores(user+paper)
- 已创建但未迁移到Dashboard的子组件方案：QuestionsPanel、PapersPanel、GradingPanel、ExamStatsPanel、UsersPanel、AnnouncementsPanel、DashboardSidebar
- 注意：server/auth.js是旧的独立认证文件，主路由在server/routes/auth.js

### 2026-04-11 代码质量审查
- 完成全栈代码审查，发现多个严重安全问题
- P0问题：数据库凭据硬编码（db-mysql.js + .env）、验证码明文返回、升级接口命令注入、JWT无限续期
- P1问题：CSRF白名单过宽、Token双传输、微信登录无验证、XSS风险(v-html)、登录限流未应用
- 架构问题：JSON/MySQL双数据源混乱（50+处if/else）、Dashboard.vue 3411行未拆分、无测试、日志系统重复
- 生成了完整的团队技术提升方案文档

### 2026-04-11 代码质量优化（第三阶段）
- **repository.js**: 提取 `withFallback(mysqlFn, jsonFn, label)` 通用函数，消除50+处重复的 try/catch fallback 模式
- **repository.js**: 新增 `getQuestionsByIds(ids)` 批量查询方法 + `getExamRecordCountByIp()` IP计数方法
- **exam.js 重大Bug修复**:
  - 删除 `hasEssay` 异步Bug（Array.some + async，始终返回 true）——后面 hasEssaySync 已修正
  - 重构提交试卷：合并 hasEssaySync 和 hasEssay 为单一循环，一次遍历完成客观题批改+主观题检测
  - 修复 N+1 查询：原来每道题单独 getQuestionById，改为 getQuestionsByIds 批量查询
  - 消除所有 `db.questions.findById()` 直接引用，全部改为 repo.getQuestionsByIds()
  - IP 限制检查改为 repo.getExamRecordCountByIp()（原来只查 JSON 数据库）
  - 所有路由改用 asyncHandler 统一错误处理
  - 为 start/save-progress/submit 增加 rateLimiters.api 限流
- **system.js 修复**:
  - 移除未使用的 `execSync` 引入（减少攻击面）
  - 移除 `crypto` 和 `https` 未使用引入
  - 移除通过读源码文件检测同步状态的脆弱代码 → 创建 sync-state.js 共享模块
  - 移除重复的日志函数（writeLog/writeErrorLog），复用 errorHandler.js
- **index.js 修复**:
  - 请求日志中间件移到路由之前（原来在之后，不记录 API 请求）
  - 删除重复的 SPA fallback（原来有两个，第二个永远不执行）
  - SPA fallback 改为中间件形式（app.use），避免 app.get('*') 中 next() 不可用
  - 同步状态改为 sync-state.js 模块
- **papers.js 修复**:
  - 消除 `db.questions.random()` 直接引用，改为 repo.getQuestions() + filter + sort
  - 随机组卷参数验证：category_ids/question_types/difficulty 白名单校验
  - 批量获取所有者信息用 Set 去重 + Promise.all 并行
  - 批量获取题目改用 repo.getQuestionsByIds()
- **questions.js 修复**:
  - LIKE 通配符注入防护：新增 `escapeLikeWildcard()` 转义 %_\ 字符
  - 缓存 key：关键词搜索时用 MD5 hash 避免超长 key
  - 创建题目增加 title/type 必填验证
  - 批量导入增加 500 条上限
- **redis.js 修复**: 连接管理改善（isConnecting 状态防止重复连接，断开后重置 client）
- **auth.js 修复**: 移除登录时缓存用户完整信息（含密码哈希）到 Redis 的逻辑
- **promotions.js**: 公开报名接口增加 rateLimiters.strict 限流
- 新增文件：`server/sync-state.js` - MySQL 同步状态共享模块
- 所有10个修改文件语法验证通过

### 2026-04-11 代码质量优化（第四阶段）
- **新增 schemas.js**: 20+ Joi 验证规则，覆盖 auth/questions/papers/exam 关键路由
- **validate 中间件上线**: 登录/注册/题目CRUD/试卷CRUD/随机组卷/考试操作/评分 全部添加输入验证
- **repository.js 高级方法**: 新增 `searchQuestions()` (分页+过滤+LIKE转义+关键词) 和 `randomQuestions()` (随机组卷+过滤)
- **questions.js 重构**: 删除 ~60 行直接 db-mysql SQL + JSON fallback，改用 repo.searchQuestions() 一行调用；移除 escapeLikeWildcard/applyFiltersAndPagination 辅助函数
- **papers.js 重构**: 删除 ~40 行直接 db-mysql SQL + JSON fallback，改用 repo.randomQuestions() 一行调用
- **auth.js 响应统一**: 所有 res.status().json() 改用 resp.success/error/unauthorized/notFound/created
- **Dashboard.vue 安全清理**: 移除 submitEssayScore 中 ~20 行 JWT Token 解析日志（泄露角色/用户ID/过期时间），移除 4 处 switchTab DEBUG 日志
- Dashboard.vue 从 3410 行减至 3369 行
- 0 处 db-mysql 直接引用保留在路由文件中（仅 system.js 健康检查保留）
- 所有修改文件语法验证通过

### 四阶段累计改进
- 总修复项：41
- 新增文件：8（repository.js, response.js, validate.js, schemas.js, sync-state.js, SafeHtml组件, Pinia stores×2）
- 消除 db 直接引用：~168 处
- 仍待改进(P3)：Dashboard拆分、分页统一、测试、缓存层提取

### 2026-04-11 代码质量优化（第五阶段）
- **Dashboard.vue 大规模拆分**: 3369行 → 2590行（-23%，减少779行）
  - 新建 GradingPanel.vue (466行) — 待评分管理+评分抽屉，完全独立
  - 新建 UsersPanel.vue (224行) — 用户管理，admin专属
  - 新建 AnnouncementsPanel.vue (290行) — 公告管理+富文本编辑器
  - Dashboard 通过 ref 调用 GradingPanel 的 loadPendingGrading/scrollToPaper
  - 试卷列表的待评分 badge 改用 gradingPanelRef?.papersWithPendingGrading
  - Socket.io 的 pending-essay-grade 事件改为调用子组件方法
- **分页参数统一**: questions.js 和 papers.js 的 `limit` 参数统一为 `pageSize`
  - 前端 API 调用也同步更新: `getQuestions({limit:100})` → `getQuestions({pageSize:100})`
  - schemas.js 验证规则同步更新
- **代码清理**: 删除已迁移的 ~780 行旧代码（数据声明+方法+模板+弹窗）
- 仍待改进(P4)：QuestionsPanel/PapersPanel 拆分、测试、缓存层提取

### 五阶段累计改进
- 总修复项：46
- 新增文件：11（+GradingPanel.vue, UsersPanel.vue, AnnouncementsPanel.vue）
- Dashboard.vue 行数：3369 → 2590（-23%）
- 分页参数统一：全部接口使用 page/pageSize

### 2026-04-11 代码质量优化（第六阶段）
- **新增 cache.js 统一缓存层**: `server/utils/cache.js`
  - `withCache(key, fetchFn, options)` - 先查缓存未命中则执行查询并写入，一行替代4处重复的 get/set 模式
  - `clearCache(pattern, label)` - 统一通配符清除，替代4个路由中重复的 clearXxxCache 函数
  - `namespaces` - 缓存 key 命名空间（questions/categories/promotions/system/auth）
- **4个路由迁移缓存层**:
  - questions.js: 移除 clearQuestionsCache + 直接 redis.get/set，改用 cache.withCache + cache.clearCache
  - categories.js: 移除 clearCategoriesCache + 直接 redis.get/set，全部改用 cache API
  - promotions.js: 移除 clearPromotionsCache + 直接 redis.get/set，批量操作改 Promise.all 并行
  - system.js: stats 路由改用 cache.withCache，移除直接 redis 引用
- **categories.js 全面升级**: 加 asyncHandler + resp 统一响应（原为 try/catch + res.status）
- **Dashboard.vue 大规模拆分**: 2590行 → 1169行（-55%，减少1421行）
  - 新建 QuestionsPanel.vue (~530行) — 题库管理+题目表单+批量导入+类别管理，含内联 QuestionTable 子组件
  - 新建 PapersPanel.vue (~400行) — 试卷管理+新建/编辑/随机组卷+考试URL+考试记录+考生管理
  - 新建 ExamStatsPanel.vue (~150行) — 考试数据统计+实时排名+Socket.io 连接
  - Dashboard 只保留：侧边栏/路由/升级逻辑/Socket 连接/子组件 ref
  - 9个对话框全部移入对应子组件
- **GradingPanel.vue 改进**: papers prop 改为可选，未传入时自己加载 papers 列表
- 仍待改进(P5)：测试、exam.js 拆分、system.js 拆分

### 六阶段累计改进
- 总修复项：52
- 新增文件：15（+cache.js, QuestionsPanel.vue, PapersPanel.vue, ExamStatsPanel.vue）
- Dashboard.vue 行数：3369 → 1169（-65%）
- 缓存层统一：4个路由改用 cache.js
- 路由统一响应：categories.js 完成

### 2026-04-11 全面系统审查（第七阶段）
- 发现 19 个 bug，修复 12 个，待处理 7 个
- **P0 致命（3个，已修复）**:
  - Dashboard.vue 子组件 import 路径错误：`@/components/dashboard/` → `@/views/`（子组件实际在 views 目录）
  - papers.js 第41行引用未定义变量 `limit`（应为 `pageSize`），导致接口返回 NaN
  - 前端 API 3个幽灵路由指向不存在的后端接口（manage-questions/questions/add/questions/:id DELETE）
- **P1 严重（5个，已修复）**:
  - Socket.io URL 硬编码 `http://localhost:3000` → 动态 `window.location`
  - CSP connectSrc 缺少 `http://localhost:*` 和 `https://api.github.com`
  - CSP scriptSrc 缺少 `unsafe-eval`（Vite 构建需要）
  - exam.js 21处 `res.status().json()` 未用 resp 统一工具
  - promotions.js 报名列表用 `limit` 而非 `pageSize`
- **待处理（7个）**:
  - students.js 19处直接引用 db 绕过 repo（P2）
  - announcements/promotions/users 路由缺少 asyncHandler（P2）
  - users.js 重复实现认证中间件（P3）
  - cache.js 使用阻塞式 keys 命令（P3）
  - exam.js 仍然过长 ~794行（P3）
  - papers.js GET / 未实现分页（P3）
  - Dashboard.vue 图标导入但未全部使用（P3）
### 架构注意事项（长期有效）
- **双数据源不一致风险**: MySQL 和 JSON DB 可能数据不同步（用户ID、密码等），MySQL 优先。更新数据时需确保两边同步
- **db.js 内存缓存**: JSON DB 数据在服务器启动时加载到内存，修改 db.json 文件后需重启服务器才能生效
- **Vite 构建 + SMB 共享盘**: `npm run build` 在 SMB 共享盘上会 ENOTEMPTY，需构建到 `/tmp` 再 `cp` 回去
- **CORS 配置**: 服务器端口变更时必须同步更新 `.env` 的 `ALLOWED_ORIGINS`、`config.js` 默认值、`.env.example`
- **用户数据**: MySQL 和 JSON DB 的用户 ID 不一致（MySQL thishe=1, 原JSON DB thishe=4），已同步但新注册用户可能再次不一致
- **远程 MySQL 延迟**: kb.thishe.com:33060 连接延迟高(~2s)，连接池首次建连可能超时，需要 15s connectTimeout

- 前端重新构建成功

### 2026-04-11 用户体验改进执行（第一+第二阶段）
- **第一阶段 P0**（5项）：全部在之前优化中已完成 — Dashboard 懒加载、考试结果 API 获取、ExamResult 错误处理、登录表单验证、Socket.io 单例化
- **第二阶段 P1**（7项）：
  - 侧边栏键盘导航 focusNextTab/focusPrevTab
  - 考试选项 ARIA 角色（radio/checkbox/radiogroup）+ tabindex + keyboard
  - 判断题标签 T/F → ✓/✗ 对/错
  - 未答题跳转列表 >10 项时展开/收起
  - Profile.vue Options API → script setup 迁移
  - PromotionPublic 报名成功 a-result 反馈
  - 搜索统一 300ms debounce（新建 useDebouncedSearch composable）
- 新增文件：composables/useDebouncedSearch.js
