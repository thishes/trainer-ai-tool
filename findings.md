# 项目探索发现

## 技术栈
- **前端框架**: Vue 3 + Vue Router 4
- **UI 组件库**: Element Plus 2.3.12
- **构建工具**: Vite 4.4.9
- **HTTP 客户端**: Axios
- **后端**: Express + MySQL + Sequelize
- **图标**: Element Plus Icons

## 项目结构
```
client/
├── public/           # 静态资源（背景图等）
├── src/
│   ├── api/          # API 接口
│   ├── router/       # 路由配置
│   ├── views/        # 页面组件
│   │   ├── Login.vue         # 登录页（已完成渐变背景美化）
│   │   ├── Dashboard.vue     # 管理后台（主工作区）
│   │   ├── Exam.vue          # 考试答题页
│   │   ├── ExamResult.vue    # 成绩展示页
│   │   ├── SimpleExam.vue    # 考生端（内容很少）
│   │   └── PaperQuestions.vue # 试卷题目管理
│   ├── App.vue       # 根组件
│   └── main.js       # 入口文件
```

## 样式系统现状
- 使用 Element Plus 默认主题
- 组件内 scoped CSS
- 全局基础样式在 App.vue
- 没有统一的 CSS 变量系统
- 没有自定义主题配置

## 现有设计亮点
1. **登录页** - 已有渐变背景 + 毛玻璃效果 + 渐变标题
2. **成绩页** - 渐变背景 + 卡片式布局

## 需要美化的问题
1. **Dashboard** - 纯 Element Plus 默认样式，视觉单调
2. **考试页** - emoji 图标不专业，缺乏视觉层次
3. **SimpleExam** - 几乎是空白页面
4. **整体** - 缺乏统一的设计语言和配色体系
5. **没有全局 CSS 变量**

## 美化方向
1. 建立统一的 CSS 变量系统（颜色、间距、阴影）
2. 优化 Element Plus 主题色
3. 统一按钮、卡片、表格等组件样式
4. 添加微动画和过渡效果
5. 优化大屏展示页
6. 补充 SimpleExam 页面
