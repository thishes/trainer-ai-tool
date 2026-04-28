# 培训师AI测试工具

## 项目概述

专为培训场景设计的在线考试系统，支持题库管理、试卷创建、在线考试、成绩统计等功能。

## 技术架构

- **前端**: Vue 3 + Element Plus + Vite
- **后端**: Node.js + Express
- **数据存储**: JSON文件存储（db.json）

## 系统功能

### 1. 题库管理
- 创建/编辑/删除题目
- 支持题型：单选题、多选题、判断题、问答题
- 题目难度分级
- 批量导入功能

### 2. 试卷管理
- 创建/编辑/删除试卷
- 设置时间限制、随机顺序、访问密码
- 发布试卷生成考试链接和二维码
- **题目管理**（V2新增）
  - 从题库选择题目
  - 在试卷下新建题目
  - 批量导入题目

### 3. 在线考试
- 学员输入姓名和密码（可选）开始考试
- 答题自动保存
- 计时器提醒
- 交卷确认

### 4. 成绩管理
- 查看学员考试记录
- 成绩统计分析
- 大屏展示功能

## 快速开始

### 安装依赖
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client && npm install
```

### 启动服务
```bash
# 启动后端（端口3000）
node server/index.js

# 启动前端开发服务器（端口8080）
cd client && npm run dev
```

### 访问
- 前端：http://192.168.2.4:8080
- 后端API：http://localhost:3000/api

## API 接口

### 认证
- POST /api/auth/login - 登录
- POST /api/auth/register - 注册

### 题目
- GET /api/questions - 获取题目列表
- POST /api/questions - 创建题目
- PUT /api/questions/:id - 更新题目
- DELETE /api/questions/:id - 删除题目

### 试卷
- GET /api/papers - 获取试卷列表
- POST /api/papers - 创建试卷
- PUT /api/papers/:id - 更新试卷
- DELETE /api/papers/:id - 删除试卷
- POST /api/papers/:id/publish - 发布试卷
- GET /api/papers/:id/exam-url - 获取考试链接
- GET /api/papers/:id/manage-questions - 获取试卷题目（管理用）
- POST /api/papers/:id/questions/add - 添加题目到试卷
- DELETE /api/papers/:id/questions/:questionId - 从试卷移除题目

### 考试
- POST /api/exam/start - 开始考试
- GET /api/exam/:id/questions - 获取题目
- POST /api/exam/save-progress - 保存进度
- POST /api/exam/submit - 提交试卷
- GET /api/exam/:id/result - 获取成绩
- GET /api/exam/records/:paperId - 获取成绩列表

## 版本历史

### V1.0.9 (2026-04-28)
- **封面图上传功能修复**
  - 修复 FormData 上传 Content-Type 问题（axios boundary 参数）
  - 修复 ImageUploader 响应处理（res.data?.success → res?.success）
  - 修复上传路径不匹配（server/uploads vs uploads）
  - 修复保存后封面图未更新问题
- **课程目录优化**
  - 修复目录层级结构（depth-aware flattenTree）
  - 优化课程页面样式，目录区域更柔和
  - PC 端隐藏移动端目录按钮
- **其他修复**
  - 移除调试覆盖层代码

### V1.0.8 (2026-04-26)
- 课程服务模块 Phase 1 MVP
- 分页响应格式统一
- 7 项 Array vs Map bug 修复
- 安全加固与性能优化

### V1.0.7 (2026-04-20)
- 多个关键问题修复
- 生产环境配置优化

### V2 (2026-03-21)
- 新增题目管理页面
- 从题库选择题目功能
- 试卷下新建题目功能
- 批量导入题目功能
- 优化题目与试卷匹配流程

### V1 (2026-03-20)
- 初始版本
- 题库管理基础功能
- 试卷管理基础功能
- 在线考试功能
- 成绩管理功能
