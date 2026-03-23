// server/index.js - 服务入口
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use(express.static(path.join(__dirname, '../client/dist')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行', timestamp: new Date().toISOString() });
});

// 路由
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const paperRoutes = require('./routes/papers');
const examRoutes = require('./routes/exam');

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/exam', examRoutes);

// 分类路由
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);
app.use('/api/users', require('./routes/users'));

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});

// 启动服务
app.listen(PORT, HOST, () => {
  console.log(`🚀 服务已启动: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

module.exports = app;
