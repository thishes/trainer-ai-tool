const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const REQUEST_LOG_FILE = path.join(LOG_DIR, 'request.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatDate(date) {
  return date.toISOString();
}

function writeLog(filePath, message) {
  try {
    ensureLogDir();
    const timestamp = formatDate(new Date());
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(filePath, logEntry);
  } catch (e) {
    console.error('Failed to write log:', e.message);
  }
}

function errorLog(err, req = {}) {
  const timestamp = formatDate(new Date());
  const userId = req.user?.id || req.user?.username || 'anonymous';
  const method = req.method || 'UNKNOWN';
  const url = req.originalUrl || req.url || 'UNKNOWN';
  const userAgent = req.headers?.['user-agent'] || req.get?.('User-Agent') || 'UNKNOWN';
  const stack = err.stack || '';

  const logEntry = `[${timestamp}] [ERROR] ${err.message}\n` +
    `  User: ${userId}\n` +
    `  Method: ${method}\n` +
    `  URL: ${url}\n` +
    `  User-Agent: ${userAgent}\n` +
    `  Stack: ${stack}\n`;

  writeLog(ERROR_LOG_FILE, logEntry);

  console.error(`[ERROR] ${timestamp}: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(stack);
  }
}

function requestLog(req, res, duration) {
  const timestamp = formatDate(new Date());
  const userId = req.user?.id || 'anonymous';
  const method = req.method;
  const url = req.originalUrl || req.url;
  const status = res.statusCode;
  const contentLength = res.get('Content-Length') || 0;

  const logEntry = `[${timestamp}] [REQUEST] ${method} ${url} ${status} ${duration}ms - ${contentLength}bytes - User:${userId}`;

  writeLog(REQUEST_LOG_FILE, logEntry);
}

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

function errorHandler(err, req, res, next) {
  err.timestamp = err.timestamp || new Date().toISOString();

  errorLog(err, req);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details || []
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    return res.status(401).json({
      success: false,
      message: '登录已过期，请重新登录',
      code: 'UNAUTHORIZED'
    });
  }

  if (err.name === 'ValidationError' || err.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: err.message || '请求参数错误',
      code: 'VALIDATION_ERROR',
      details: err.details || []
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: '数据已存在，请勿重复添加',
      code: 'DUPLICATE_ENTRY'
    });
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      message: '数据库连接失败，请稍后重试',
      code: 'DATABASE_ERROR'
    });
  }

  console.error('[FATAL] Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? '服务器内部错误，请联系管理员'
      : err.message,
    code: 'INTERNAL_ERROR'
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `路由 ${req.method} ${req.path} 不存在`,
    code: 'ROUTE_NOT_FOUND'
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.includes('/health') && !req.path.includes('/metrics')) {
      requestLog(req, res, duration);
    }
  });

  next();
}

process.on('uncaughtException', (err) => {
  errorLog(err, {});
  console.error('[FATAL] Uncaught Exception - exiting...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  errorLog(err, {});
  console.error('[FATAL] Unhandled Rejection at:', promise);
});

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestLogger,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};