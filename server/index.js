// server/index.js - 服务入口
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = process.env.BASE_URL || `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
app.locals.BASE_URL = BASE_URL;

// Socket.io 连接管理
const examRooms = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // 加入试卷房间
  socket.on('join-paper', (paperId) => {
    socket.join(`paper-${paperId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined paper-${paperId}`);
  });

  // 离开试卷房间
  socket.on('leave-paper', (paperId) => {
    socket.leave(`paper-${paperId}`);
    console.log(`[Socket.io] Socket ${socket.id} left paper-${paperId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// 导出io供路由使用
app.set('io', io);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/exam.html', (req, res) => {
  const paperId = req.query.paper || '3';
  res.redirect('/#/exam/' + paperId);
});

// 静态文件
app.use(express.static(path.join(__dirname, '../client/dist')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行', timestamp: new Date().toISOString() });
});

// 路由
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const paperRoutes = require('./routes/papers');
const examRoutes = require('./routes/exam');
const announcementRoutes = require('./routes/announcements');
const studentRoutes = require('./routes/students');

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/students', studentRoutes);

// 分类路由
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

// 升级路由
app.use('/api/upgrade', require('./routes/upgrade'));

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
server.listen(PORT, HOST, () => {
  console.log(`🚀 服务已启动: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

module.exports = app;
