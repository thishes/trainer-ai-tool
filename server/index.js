// server/index.js - 服务入口
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

console.log('正在启动后端服务...');

require('dotenv').config();

const config = require('./config');
console.log('配置加载完成');

const app = express();
const server = http.createServer(app);

console.log('Express 应用已创建');

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

console.log('Socket.IO 已初始化');

// ============================================
// MySQL 初始化（异步，不阻塞启动）
// ============================================
const dbMysql = require('./db-mysql');
dbMysql.init().then(() => {
  console.log('[MySQL] 已初始化');
  if (dbMysql.isConnected()) {
    console.log('[MySQL] 连接状态: 已连接');
  }
}).catch(err => {
  console.warn('[MySQL] 初始化失败:', err.message);
});

// 引入 db 模块并初始化 MySQL
const db = require('./db');
db.initMySQL().then(connected => {
  if (connected) {
    console.log('[DB] JSON 数据库 MySQL 初始化成功');
  }
}).catch(err => {
  console.warn('[DB] JSON 数据库 MySQL 初始化失败:', err.message);
});

// ============================================
// MySQL 恢复检测与自动同步（后台定时任务）
// ============================================
const MYSQL_CHECK_INTERVAL = 30000;
let syncInProgress = false;

setInterval(async () => {
  if (syncInProgress) {
    console.log('[DB] 同步任务正在进行中，跳过本次检测');
    return;
  }
  try {
    const status = db.getMySQLStatus();
    if (status.degradedMode && status.mysqlConnected) {
      console.log('[DB] 检测到 MySQL 已恢复且处于降级模式，开始执行同步...');
      syncInProgress = true;
      const syncResult = await db.syncToMySQL();
      if (syncResult) {
        console.log('[DB] MySQL 同步成功，退出降级模式');
      } else {
        console.warn('[DB] MySQL 同步失败，保持降级模式');
      }
      syncInProgress = false;
    }
  } catch (e) {
    console.error('[DB] MySQL 状态检测异常:', e.message);
    syncInProgress = false;
  }
}, MYSQL_CHECK_INTERVAL);

console.log(`[DB] MySQL 恢复检测已启动，检测间隔: ${MYSQL_CHECK_INTERVAL / 1000}秒`);

// ============================================
// 安全加固: 安全响应头
// ============================================
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'", "data:"],
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
const csrfExclude = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/me',
  '/api/students/verify',
  '/api/papers',
  '/api/papers/public',
  '/api/papers/\\d+/exam-url',
  '/api/promotions',
  '/api/exam/start',
  '/api/exam/save-progress',
  '/api/exam/submit',
  '/api/exam/questions',
  '/api/exam/\\d+/questions',
  '/api/exam/\\d+/result',
  '/api/exam/records',
  '/api/exam/stats',
  '/api/exam/grade-essay',
  '/api/exam/\\d+/grade',
  '/api/categories',
  '/api/questions',
  '/api/users',
  '/api/announcements',
  '/api/students'
];

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

// 静态文件 - 开启缓存和压缩
app.use(express.static(path.join(__dirname, '../client/dist'), {
  maxAge: '1d', // 缓存1天
  etag: true,
  lastModified: true
}));

// SPA fallback - 所有非API路由返回index.html
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/assets')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    next();
  }
});

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
// const apiDocsRoutes = require('./routes/api-docs'); // 临时注释

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/students', studentRoutes);
// app.use('/api', apiDocsRoutes); // 临时注释

// 分类路由
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

// 升级路由
app.use('/api/upgrade', require('./routes/upgrade'));

app.use('/api/users', require('./routes/users'));

// 宣推服务路由
app.use('/api/promotions', require('./routes/promotions'));

// 系统管理路由
app.use('/api/system', require('./routes/system'));

// 引入错误处理中间件
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler');

// 请求日志
app.use(requestLogger);

// 404 处理
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

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