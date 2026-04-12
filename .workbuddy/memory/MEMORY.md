# 项目记忆

## 项目：培训师AI工具 (trainer-ai-tool)

### 技术栈
- 前端：Vue 3 + Arco Design + Vite + Pinia
- 后端：Node.js + Express
- 存储：JSON文件 + MySQL（双写）+ Redis缓存
- 实时：Socket.IO

### 2026-04-11 代码优化（第2-7阶段摘要）
- **repository.js 统一数据访问层**: 消除 ~168 处 db 直接引用，withFallback() 通用函数，searchQuestions/randomQuestions/getQuestionsByIds 等高级方法
- **安全修复（P0+P1）**: 数据库凭据保护、验证码SVG、升级接口防注入、JWT续期限制、CSRF白名单缩减、CORS函数验证、限流、v-html→SafeHtml
- **统一工具**: response.js、validate.js+Joi、schemas.js、cache.js、sync-state.js
- **Dashboard.vue 拆分**: 3369行→1169行（-65%），6个子组件（QuestionsPanel/PapersPanel/GradingPanel/UsersPanel/AnnouncementsPanel/ExamStatsPanel）
- **分页统一**: 全部接口使用 page/pageSize
- **缓存层**: 4个路由迁移到 cache.js
- **19个bug审查**: 修复12个，待处理7个（students.js/students/announcements路由缺asyncHandler等P2-P3）
- 新增文件：15个
### 架构注意事项（长期有效）
- **统一 .env 管理（2026-04-12 确立）**: 项目只有一个 `.env`，位于根目录。所有入口（server/根目录脚本/server/scripts/）都通过 `path.join(__dirname, '...')` 指向根目录 `.env`。不再有 `server/.env`。
- **双数据源不一致风险**: MySQL 和 JSON DB 可能数据不同步（用户ID、密码等），MySQL 优先。更新数据时需确保两边同步
- **db.js 内存缓存**: JSON DB 数据在服务器启动时加载到内存，修改 db.json 文件后需重启服务器才能生效
- **Vite 构建 + SMB 共享盘**: `npm run build` 在 SMB 共享盘上会 ENOTEMPTY，需构建到 `/tmp` 再 `cp` 回去
- **CORS 配置**: 服务器端口变更时必须同步更新 `.env` 的 `ALLOWED_ORIGINS`、`config.js` 默认值、`.env.example`
- **用户数据**: MySQL 和 JSON DB 的用户 ID 不一致（MySQL thishe=1, 原JSON DB thishe=4），已同步但新注册用户可能再次不一致
- **远程 MySQL 延迟**: kb.thishe.com:33060 连接延迟高(~2s)，连接池首次建连可能超时，需要 15s+ connectTimeout
- **MySQL 8.0.45**: 远程数据库版本，`LIMIT ? OFFSET ?` 参数化查询会报错，必须用字符串拼接 + parseInt()

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
