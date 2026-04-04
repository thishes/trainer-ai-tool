// server/middleware/logger.js - 结构化日志中间件
const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 生成日志文件名（按日期分割）
function getLogFileName() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logDir, `${dateStr}.log`);
}

// 格式化日志条目
function formatLogEntry(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  return JSON.stringify(logEntry);
}

// 写入日志到文件
function writeToFile(logLine) {
  const logFile = getLogFileName();
  fs.appendFile(logFile, logLine + '\n', (err) => {
    if (err) {
      console.error('写入日志文件失败:', err.message);
    }
  });
}

// 日志级别
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// 创建日志函数
function createLogger(moduleName) {
  return {
    debug: (message, meta = {}) => {
      if (process.env.DEBUG === 'true') {
        const logLine = formatLogEntry(LogLevel.DEBUG, message, { module: moduleName, ...meta });
        console.debug(`[DEBUG] ${moduleName}:`, message, meta);
        writeToFile(logLine);
      }
    },
    
    info: (message, meta = {}) => {
      const logLine = formatLogEntry(LogLevel.INFO, message, { module: moduleName, ...meta });
      console.info(`[INFO] ${moduleName}:`, message, meta);
      writeToFile(logLine);
    },
    
    warn: (message, meta = {}) => {
      const logLine = formatLogEntry(LogLevel.WARN, message, { module: moduleName, ...meta });
      console.warn(`[WARN] ${moduleName}:`, message, meta);
      writeToFile(logLine);
    },
    
    error: (message, meta = {}) => {
      const logLine = formatLogEntry(LogLevel.ERROR, message, { module: moduleName, ...meta });
      console.error(`[ERROR] ${moduleName}:`, message, meta);
      writeToFile(logLine);
    }
  };
}

// HTTP 请求日志中间件
function httpLogger(req, res, next) {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // 附加请求 ID 到 request 对象
  req.requestId = requestId;
  
  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logger = createLogger('HTTP');
    
    const logMeta = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress
    };
    
    if (res.statusCode >= 500) {
      logger.error(`HTTP ${res.statusCode}`, logMeta);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${res.statusCode}`, logMeta);
    } else {
      logger.info(`HTTP ${res.statusCode}`, logMeta);
    }
  });
  
  next();
}

module.exports = {
  createLogger,
  httpLogger,
  LogLevel,
  logDir
};
