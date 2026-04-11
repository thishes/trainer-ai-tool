// server/routes/system.js - 系统管理路由
const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const repo = require('../repository');
const authenticate = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const cache = require('../utils/cache');
const syncState = require('../sync-state');

const START_TIME = Date.now();

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

router.get('/info', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const uptime = Date.now() - START_TIME;
  const uptimeDays = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const uptimeHours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

  const info = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    npmVersion: process.env.npm_package_dependencies ? 'bundled' : 'unknown',
    port: process.env.PORT || 3000,
    uptime: {
      milliseconds: uptime,
      days: uptimeDays,
      hours: uptimeHours,
      minutes: uptimeMinutes,
      formatted: `${uptimeDays}天${uptimeHours}小时${uptimeMinutes}分钟`
    },
    env: process.env.NODE_ENV || 'development',
    pid: process.pid
  };

  res.json({ success: true, data: info });
}));

router.get('/metrics', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsagePercent = ((1 - totalIdle / totalTick) * 100).toFixed(1);

  const networkInterfaces = os.networkInterfaces();
  let primaryIP = '127.0.0.1';
  for (const name of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        primaryIP = iface.address;
        break;
      }
    }
  }

  const metrics = {
    memory: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      usagePercent: memUsagePercent
    },
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      usagePercent: cpuUsagePercent
    },
    network: {
      interfaces: Object.keys(networkInterfaces).length,
      primaryIP
    },
    eventLoopLag: process.cpuUsage().system / 1000000,
    activeHandles: process._getActiveHandles ? process._getActiveHandles().length : 0,
    activeRequests: process._getActiveRequests ? process._getActiveRequests().length : 0
  };

  res.json({ success: true, data: metrics });
}));

router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const cacheKey = cache.namespaces.system('stats');
  const { data, fromCache } = await cache.withCache(
    cacheKey,
    async () => {
      const [users, questions, papers, examRecords, announcements] = await Promise.all([
        repo.getUsers(),
        repo.getQuestions(),
        repo.getPapers(),
        repo.getExamRecords(),
        repo.getAnnouncements()
      ]);

      const pendingGradingCount = examRecords.filter(r => r.status === 'submitted').length;
      const publishedPapers = papers.filter(p => p.status === 'published').length;
      const draftPapers = papers.filter(p => p.status === 'draft').length;
      const activeQuestions = questions.filter(q => q.status === 'active' || q.status === 'published').length;

      return {
        users: {
          total: users.length,
          admins: users.filter(u => u.role === 'admin').length,
          trainers: users.filter(u => u.role === 'trainer').length,
          students: users.filter(u => u.role === 'student').length
        },
        questions: {
          total: questions.length,
          active: activeQuestions,
          byType: {
            single: questions.filter(q => q.type === 'single').length,
            multiple: questions.filter(q => q.type === 'multiple').length,
            judge: questions.filter(q => q.type === 'judge').length,
            subjective: questions.filter(q => q.type === 'subjective').length
          }
        },
        papers: {
          total: papers.length,
          published: publishedPapers,
          draft: draftPapers
        },
        examRecords: {
          total: examRecords.length,
          pending: pendingGradingCount,
          completed: examRecords.filter(r => r.status === 'completed').length,
          graded: examRecords.filter(r => r.graded).length
        },
        announcements: {
          total: announcements.length,
          published: announcements.filter(a => a.status === 'published').length
        }
      };
    },
    { ttl: 300 }
  );

  res.json({ success: true, data, ...(fromCache ? { fromCache: true } : {}) });
}));

router.get('/database', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const db = require('../db');
  const mysqlStatus = db.getMySQLStatus();
  const { mysqlConnected, useDualWrite, degradedMode, lastSync } = mysqlStatus;

  let dbStats = {
    type: 'unknown',
    status: 'unknown',
    checkedAt: new Date().toISOString(),
    mode: 'json_only',
    mysqlConnected: false,
    degradedMode: false,
    useDualWrite: false,
    lastSync: null,
    syncInProgress: syncState.isInProgress()
  };

  if (mysqlConnected && useDualWrite) {
    dbStats.mode = 'dual_write';
  } else if (mysqlConnected && !useDualWrite) {
    dbStats.mode = 'mysql_only';
  } else if (degradedMode) {
    dbStats.mode = 'degraded';
  }

  dbStats.mysqlConnected = mysqlConnected;
  dbStats.degradedMode = degradedMode;
  dbStats.useDualWrite = useDualWrite;
  dbStats.lastSync = lastSync;

  try {
    const dbMysql = require('../db-mysql');
    const mysqlHealth = await dbMysql.healthCheck();

    if (mysqlConnected) {
      const dbCounters = dbMysql.counters;

      dbStats.type = 'mysql';
      dbStats.status = mysqlHealth ? 'healthy' : 'unhealthy';
      dbStats.host = process.env.DB_HOST || 'localhost';
      dbStats.port = parseInt(process.env.DB_PORT) || 3306;
      dbStats.database = process.env.DB_NAME || 'trainer_ai_tool';
      dbStats.tables = {
        users: { count: dbCounters.users || 0 },
        categories: { count: dbCounters.categories || 0 },
        questions: { count: dbCounters.questions || 0 },
        papers: { count: dbCounters.papers || 0 },
        exam_records: { count: dbCounters.exam_records || 0 },
        announcements: { count: dbCounters.announcements || 0 },
        students: { count: dbCounters.students || 0 },
        essay_scores: { count: dbCounters.essay_scores || 0 },
        promotions: { count: dbCounters.promotions || 0 },
        promotion_signups: { count: dbCounters.promotion_signups || 0 }
      };
      dbStats.totalRecords = Object.values(dbStats.tables).reduce((sum, t) => sum + t.count, 0);
      dbStats.health = { status: mysqlHealth ? 'healthy' : 'unhealthy', checkedAt: new Date().toISOString() };
    } else {
      throw new Error('MySQL not connected');
    }
  } catch (mysqlError) {
    const dataPath = path.join(__dirname, '../db.json');
    dbStats.type = 'json';
    dbStats.path = dataPath;

    if (fs.existsSync(dataPath)) {
      const stats = fs.statSync(dataPath);
      dbStats.exists = true;
      dbStats.size = stats.size;
      dbStats.sizeFormatted = formatBytes(stats.size);
      dbStats.lastModified = stats.mtime.toISOString();

      const dbData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      dbStats.tables = {
        users: { count: dbData.users?.length || 0 },
        categories: { count: dbData.categories?.length || 0 },
        questions: { count: dbData.questions?.length || 0 },
        papers: { count: dbData.papers?.length || 0 },
        examRecords: { count: dbData.examRecords?.length || 0 },
        announcements: { count: dbData.announcements?.length || 0 },
        students: { count: dbData.students?.length || 0 },
        essayScores: { count: dbData.essayScores?.length || 0 }
      };
      dbStats.totalRecords = Object.values(dbStats.tables).reduce((sum, t) => sum + t.count, 0);
      dbStats.status = 'healthy';
      dbStats.health = { status: 'healthy', checkedAt: new Date().toISOString() };
    } else {
      dbStats.exists = false;
      dbStats.status = 'unhealthy';
      dbStats.error = 'Database file not found';
      dbStats.health = { status: 'unhealthy', checkedAt: new Date().toISOString(), error: 'Database file not found' };
    }
  }

  res.json({ success: true, data: dbStats });
}));

router.post('/database/backup', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const dataPath = path.join(__dirname, '../db.json');
  const backupDir = path.join(__dirname, '../backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `db-backup-${timestamp}.json`);

  if (!fs.existsSync(dataPath)) {
    return res.status(404).json({ success: false, message: '数据库文件不存在' });
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(dataPath, backupPath);
  const backupStats = fs.statSync(backupPath);

  res.json({
    success: true,
    message: '备份成功',
    data: {
      path: backupPath,
      size: backupStats.size,
      sizeFormatted: formatBytes(backupStats.size),
      createdAt: backupStats.ctime.toISOString()
    }
  });
}));

router.get('/logs', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const { type = 'all', page = 1, pageSize = 50 } = req.query;
  const LOG_DIR = path.join(__dirname, '../../logs');
  const allLogs = [];

  if (type === 'all' || type === 'system') {
    try {
      const logFile = path.join(LOG_DIR, 'request.log');
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        allLogs.push(...lines.slice(-200));
      }
    } catch (e) {}
  }

  if (type === 'all' || type === 'error') {
    try {
      const errorFile = path.join(LOG_DIR, 'error.log');
      if (fs.existsSync(errorFile)) {
        const content = fs.readFileSync(errorFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        allLogs.push(...lines.slice(-200));
      }
    } catch (e) {}
  }

  const reversedLogs = [...allLogs].reverse();
  const start = (parseInt(page) - 1) * parseInt(pageSize);
  const end = start + parseInt(pageSize);
  const paginatedLogs = reversedLogs.slice(start, end);

  res.json({
    success: true,
    data: {
      logs: paginatedLogs,
      total: reversedLogs.length,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }
  });
}));

router.post('/clear-logs', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const { type = 'error' } = req.body;
  const LOG_DIR = path.join(__dirname, '../../logs');

  if (type === 'all' || type === 'error') {
    const errorFile = path.join(LOG_DIR, 'error.log');
    if (fs.existsSync(errorFile)) {
      fs.writeFileSync(errorFile, '');
    }
  }

  if (type === 'all' || type === 'system') {
    const requestFile = path.join(LOG_DIR, 'request.log');
    if (fs.existsSync(requestFile)) {
      fs.writeFileSync(requestFile, '');
    }
  }

  res.json({ success: true, message: '日志已清除' });
}));

router.get('/upgrade/check', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const updateScript = require('../scripts/update-script');
  const result = await updateScript.checkForUpdates();

  if (result.error) {
    return res.json({
      success: true,
      data: {
        currentVersion: result.currentVersion,
        latestVersion: null,
        hasUpdate: false,
        updateAvailable: false,
        releaseInfo: null,
        error: result.error
      }
    });
  }

  res.json({
    success: true,
    data: {
      currentVersion: result.currentVersion,
      latestVersion: result.latestVersion,
      hasUpdate: result.hasUpdate,
      updateAvailable: result.hasUpdate,
      releaseInfo: result.releaseInfo || null,
      error: null
    }
  });
}));

router.post('/upgrade', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权限' });
  }

  const { version } = req.body;
  if (!version) {
    return res.status(400).json({ success: false, message: '版本号不能为空' });
  }

  const updateScript = require('../scripts/update-script');
  const packageJson = require('../../package.json');
  const currentVersion = packageJson.version;

  const result = await updateScript.checkForUpdates();

  if (!result.hasUpdate && version !== result.latestVersion) {
    return res.status(400).json({
      success: false,
      message: `指定的版本 ${version} 不存在或低于当前版本 ${currentVersion}`
    });
  }

  const downloadUrl = result.releaseInfo?.downloadUrl;
  const updateResult = await updateScript.performUpdate(version, downloadUrl);

  if (updateResult.success) {
    res.json({
      success: true,
      message: '升级成功，请手动重启服务以应用更新',
      requiresRestart: true
    });
  } else {
    res.status(500).json({ success: false, message: updateResult.message });
  }
}));

module.exports = router;
