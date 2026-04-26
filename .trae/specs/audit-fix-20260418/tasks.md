# Tasks - 系统审计修复与优化（增强版）✅ 已完成

## 阶段一：基础设施准备
- [x] **Task 1.1**: 数据库 Schema 升级 + 索引创建 ✅
  - [x] 添加 objective_score, objective_total, subjective_score, subjective_total, percentage 列
  - [x] 创建复合索引 idx_exam_records_paper_status (paper_id, status)
  - [x] 创建索引 idx_paper_questions_paper_id (paper_id)
  - [x] 回填已有记录的分离计分数据

## 阶段二：核心 Bug 修复（后端）
- [x] **Task 2.1**: 修复 `getExamRecordsByPaperId` status 数组查询 Bug ✅
- [x] **Task 2.2**: 修复所有 Array vs Map Bug（共7处：exam.js×5 + papers.js×2）✅
- [x] **Task 2.3**: 实现科学计分算法（客观题/主观题分离）✅
- [x] **Task 2.4**: 开放 result 接口访问权限（可选认证）✅

## 阶段三：性能优化
- [x] **Task 3.1**: Stats 接口缓存机制（Map + TTL 10秒）✅
- [x] **Task 3.2**: 查询性能优化（复合索引 + IN 子句）✅
- [x] **Task 3.3**: 前端渲染优化（防抖刷新 + WebSocket 降级）✅

## 阶段四：安全性增强
- [x] **Task 4.1**: 输入验证增强（schemas.js 全量加固）✅
- [x] **Task 4.2**: 权限边界检查（XSS防护 + 越权防护）✅
- [x] **Task 4.3**: 错误信息脱敏（生产/开发环境区分）✅

## 阶段五：健壮性提升
- [x] **Task 5.1**: 异常处理完善（try-catch + 重试机制）✅
- [x] **Task 5.2**: 降级机制实现（WebSocket → 轮询降级）✅
- [x] **Task 5.3**: 日志系统增强（结构化审计日志）✅

## 阶段六：前端适配
- [x] **Task 6.1**: Exam.vue（student_name参数 + WebSocket降级）✅
- [x] **Task 6.2**: ExamResult.vue（API传参 + 分离计分展示）✅
- [x] **Task 6.3**: ExamStatsPanel.vue（防抖刷新）✅

## 阶段七：集成测试与验证
- [x] **Task 7.1-7.4**: 全部测试完成，发现并修复3个安全漏洞 ✅
  - P0: start路由XSS注入 → 已修复
  - P1: save-progress验证绕过 → 已修复
  - P2: submit schema遗漏 → 已修复

## 阶段八：系统走查与 Bug 梳理
- [x] **Task 8.1**: 用户故事全覆盖走查 ✅
- [x] **Task 8.2**: 代码质量审查（11个文件逐行审查）✅
- [x] **Task 8.3**: 新Bug清单整理（发现4个新问题）✅
