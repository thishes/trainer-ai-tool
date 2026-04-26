// server/index.js - 服务入口
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

console.log('正在启动后端服务...');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

// 【端口规范】前端固定3000，后端固定3001
const PORT = 3001;  // 强制后端使用3001，不读取环境变量
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = process.env.BASE_URL || process.env.FRONTEND_URL || config.FRONTEND_URL || `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
app.locals.BASE_URL = BASE_URL;

console.log('Socket.IO 已初始化');

// ============================================
// MySQL 初始化（异步，不阻塞启动）
// 只调用 dbMysql.init() 一次，db.initMySQL() 会在内部复用结果
// ============================================
const dbMysql = require('./db-mysql');
const db = require('./db');

dbMysql.init().then(() => {
  console.log('[MySQL] 已初始化');
  if (dbMysql.isConnected()) {
    console.log('[MySQL] 连接状态: 已连接');
    // 通知 db.js MySQL 已就绪（不再重复调用 init）
    db.setMySQLReady();
  }
}).catch(err => {
  console.warn('[MySQL] 初始化失败:', err.message);
});

// ============================================
// MySQL 恢复检测与自动同步（后台定时任务）
// 使用 sync-state 模块共享同步状态
// ============================================
const syncState = require('./sync-state');
const MYSQL_CHECK_INTERVAL = 30000;

setInterval(async () => {
  if (syncState.isInProgress()) {
    console.log('[DB] 同步任务正在进行中，跳过本次检测');
    return;
  }
  try {
    // 如果 MySQL 未连接，尝试重连
    if (!dbMysql.isConnected()) {
      console.log('[DB] MySQL 未连接，尝试重连...');
      const reconnected = await dbMysql.reconnect();
      if (reconnected) {
        console.log('[DB] ✅ MySQL 重连成功！');
        db.setMySQLReady();
      }
      return;
    }

    const status = db.getMySQLStatus();
    // 只有在启用双写模式且处于降级模式时才执行同步
    if (status.useDualWrite && status.degradedMode && status.mysqlConnected) {
      console.log('[DB] 检测到 MySQL 已恢复且处于降级模式，开始执行同步...');
      syncState.setInProgress(true);
      const syncResult = await db.syncToMySQL();
      if (syncResult) {
        console.log('[DB] MySQL 同步成功，退出降级模式');
      } else {
        console.warn('[DB] MySQL 同步失败，保持降级模式');
      }
      syncState.setInProgress(false);
    }
  } catch (e) {
    console.error('[DB] MySQL 状态检测异常:', e.message);
    syncState.setInProgress(false);
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
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "https://api.github.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
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

// ============================================
// 中间件（必须在路由之前注册）
// ============================================
const ALLOWED_ORIGINS = config.CORS_ORIGINS
  ? config.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const LOCALHOST_ORIGINS = [
  'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080',
  'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:8080'
];

console.log('[CORS] ALLOWED_ORIGINS:', JSON.stringify(ALLOWED_ORIGINS));
console.log('[CORS] NODE_ENV:', process.env.NODE_ENV);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (LOCALHOST_ORIGINS.includes(origin)) {
      console.log(`[CORS] 允许本地开发来源: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`[CORS] 拒绝来源: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400
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

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'strict'
  }
});

// 白名单路由
const csrfExclude = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/captcha',
  '/api/auth/me',
  '/api/auth/csrf-token',
  '/api/students/verify',
  '/api/papers/public',
  '/api/exam/start',
  '/api/exam/save-progress',
  '/api/exam/submit',
  '/api/exam/',
  '/api/promotions',
  '/api/promotions/:id/signups',
  '/api/announcements/upload',
  '/api/upload',
  '/api/courses'
];

app.use((req, res, next) => {
  if (csrfExclude.some(path => req.path.startsWith(path))) {
    return next();
  }
  csrfProtection(req, res, next);
});

// CSRF 错误处理
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: '您的请求已过期，请刷新页面重试' });
  }
  next(err);
});

// ============================================
// 请求日志（必须在路由之前注册才能记录API请求）
// ============================================
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorHandler');
app.use(requestLogger);

// ============================================
// 静态文件 - 支持预压缩 (.gz / .br)
// ============================================
const distPath = path.join(__dirname, '../client/dist');
const fs = require('fs');
const mime = require('mime');

// 预压缩文件缓存（避免每次请求 existsSync）
const precompressCache = new Map();
function hasPrecompressedFile(filePath) {
  if (precompressCache.has(filePath)) return precompressCache.get(filePath);
  const br = fs.existsSync(filePath + '.br');
  const gz = fs.existsSync(filePath + '.gz');
  const result = { br, gz };
  precompressCache.set(filePath, result);
  return result;
}

// 预压缩中间件：原始文件不存在时，自动返回 .br/.gz 版本
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  const filePath = path.join(distPath, req.path);
  // 安全检查
  if (!filePath.startsWith(distPath)) return next();

  const compressed = hasPrecompressedFile(filePath);
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const contentType = mime.lookup(filePath) || 'application/octet-stream';

  if (acceptEncoding.includes('br') && compressed.br) {
    res.set('Content-Encoding', 'br');
    res.set('Content-Type', contentType);
    req.url = req.url + '.br';
    return express.static(distPath, { maxAge: '1d', etag: true, lastModified: true })(req, res, next);
  }

  if (acceptEncoding.includes('gzip') && compressed.gz) {
    res.set('Content-Encoding', 'gzip');
    res.set('Content-Type', contentType);
    req.url = req.url + '.gz';
    return express.static(distPath, { maxAge: '1d', etag: true, lastModified: true })(req, res, next);
  }

  next();
});

app.use(express.static(distPath, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1h',
  etag: true
}));

// ============================================
// API 路由
// ============================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行', timestamp: new Date().toISOString() });
});


// CSRF Token 端点（用于前端获取token）
app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
  res.json({ success: true, csrfToken: req.csrfToken() });
});
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const paperRoutes = require('./routes/papers');
const examRoutes = require('./routes/exam');
const announcementRoutes = require('./routes/announcements');
const studentRoutes = require('./routes/students');
const uploadRoutes = require('./routes/upload');

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/upload', uploadRoutes);

// 分类路由
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

// 升级路由
app.use('/api/upgrade', require('./routes/upgrade'));

// 用户路由
app.use('/api/users', require('./routes/users'));

// 宣推服务路由
app.use('/api/promotions', require('./routes/promotions'));

// 课程服务路由
const courseRoutes = require('./routes/courses');
app.use('/api/courses', courseRoutes);
app.use('/api/public', courseRoutes);

// 【T2.1】学习进度追踪路由
const progressRoutes = require('./routes/progress');
app.use('/api/progress', require('./middleware/auth'), progressRoutes);

// 系统管理路由
app.use('/api/system', require('./routes/system'));

// ============================================
// SPA fallback + 错误处理（必须在路由之后）
// ============================================

// SPA fallback - 所有非API/非静态资源路由返回 index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/assets')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'), (err) => {
      if (err) next(err);
    });
  } else {
    next();
  }
});

// 404 处理
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// 启动服务
server.listen(PORT, HOST, () => {
  console.log(`🚀 服务已启动: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🔒 安全功能已启用: Helmet + CSRF + Cookie`);
});

module.exports = app;
