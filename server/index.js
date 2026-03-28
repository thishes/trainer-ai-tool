// server/index.js - 服务入口 (安全加固版)
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const config = require('./config');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: config.ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

const DEBUG = config.DEBUG;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = process.env.BASE_URL || `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
app.locals.BASE_URL = BASE_URL;

// ============================================
// 安全加固: 安全响应头
// ============================================
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 开发环境允许 inline脚本，生产环境应移除
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  }
}));

// Socket.io 连接管理
const examRooms = new Map();

io.on('connection', (socket) => {
  if (DEBUG) console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('join-paper', (paperId) => {
    socket.join(`paper-${paperId}`);
    if (DEBUG) console.log(`[Socket.io] Socket ${socket.id} joined paper-${paperId}`);
  });

  socket.on('leave-paper', (paperId) => {
    socket.leave(`paper-${paperId}`);
    if (DEBUG) console.log(`[Socket.io] Socket ${socket.id} left paper-${paperId}`);
  });

  socket.on('disconnect', () => {
    if (DEBUG) console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// 导出io供路由使用
app.set('io', io);

// 中间件
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:5173']),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// 安全加固: CSRF 防护
// ============================================
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const isSecureCookie = config.SECURE_COOKIE;

// 仅对 API 启用 CSRF 保护
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'strict'
  }
});

// 白名单路由（公开API不需要CSRF）
const csrfExclude = ['/api/health', '/api/auth/login', '/api/auth/register', '/api/students/verify'];

app.use((req, res, next) => {
  if (csrfExclude.some(path => req.path.startsWith(path))) {
    return next();
  }
  csrfProtection(req, res, next);
});

// 错误处理 - CSRF 错误
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: '您的请求已过期，请刷新页面重试' });
  }
  next(err);
});

app.get('/exam.html', (req, res) => {
  const paperId = req.query.paper || '3';
  res.redirect('/#/exam/' + paperId);
});

// 静态文件 - 开启缓存和压缩
app.use(express.static(path.join(__dirname, '../client/dist'), {
  maxAge: '1d', // 缓存1天
  etag: true,
  lastModified: true
}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1h',
  etag: true
}));

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
  res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
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
  console.log(`🔒 安全功能已启用: Helmet + CSRF + Cookie`);
});

module.exports = app;