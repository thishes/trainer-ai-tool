// server/index.js - 服务入口 (安全加固版)
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
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

// ============================================
// 安全加固: 安全响应头 (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: { camera: [], microphone: [], geolocation: [] }
}));

// Socket.io 连接管理
const examRooms = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('join-paper', (paperId) => {
    socket.join(`paper-${paperId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined paper-${paperId}`);
  });
  socket.on('leave-paper', (paperId) => {
    socket.leave(`paper-${paperId}`);
    console.log(`[Socket.io] Socket ${socket.id} left paper-${paperId}`);
  });
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// 中间件
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie 解析
app.use(cookieParser());

// CSRF 防护
const csrfProtection = csrf({ 
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' }
});

// 白名单路由
const csrfExclude = ['/api/health', '/api/auth/login', '/api/auth/register', '/api/students/verify', '/api/papers/public', '/api/exam/start', '/api/exam/submit', '/api/exam/.*/questions', '/api/exam/.*/result'];
app.use((req, res, next) => {
  if (csrfExclude.some(p => req.path.startsWith(p))) return next();
  csrfProtection(req, res, next);
});

// CSRF 错误处理
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

// 静态文件
app.use(express.static(path.join(__dirname, '../client/dist'), { maxAge: '1d', etag: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '1h' }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行', timestamp: new Date().toISOString() });
});

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/students', require('./routes/students'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/upgrade', require('./routes/upgrade'));
app.use('/api/users', require('./routes/users'));

// 错误处理
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

server.listen(PORT, HOST, () => {
  console.log(`🚀 服务已启动: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🔒 安全功能已启用: Helmet + CSRF + Cookie`);
});

module.exports = app;
