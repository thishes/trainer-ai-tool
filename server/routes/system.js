// server/routes/system.js - 系统管理路由
const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { execSync } = require('child_process');
const db = require('../db');
const mysqlDb = require('../db-mysql');
const authenticate = require('../middleware/auth');

const START_TIME = Date.now();
const LOG_FILE = path.join(__dirname, '../../logs/system.log');
const ERROR_LOG_FILE = path.join(__dirname, '../../logs/error.log');

function ensureLogDir() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function writeLog(level, message) {
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (e) {
    console.error('写入日志失败:', e.message);
  }
}

function writeErrorLog(message, stack) {
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [ERROR] ${message}\n${stack || ''}\n`;
    fs.appendFileSync(ERROR_LOG_FILE, logEntry);
  } catch (e) {
    console.error('写入错误日志失败:', e.message);
  }
}

router.get('/info', authenticate, async (req, res) => {
  try {
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

    writeLog('INFO', `用户 ${req.user.username} 获取了系统信息`);
    res.json({ success: true, data: info });
  } catch (error) {
    writeErrorLog('获取系统信息失败', error.stack);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/metrics', authenticate, async (req, res) => {
  try {
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

    writeLog('INFO', `用户 ${req.user.username} 获取了运行指标`);
    res.json({ success: true, data: metrics });
  } catch (error) {
    writeErrorLog('获取运行指标失败', error.stack);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    let users, questions, papers, examRecords, announcements;

    if (mysqlDb.isConnected()) {
      try {
        users = await mysqlDb.getUsers();
        questions = await mysqlDb.getQuestions();
        papers = await mysqlDb.getPapers();
        examRecords = await mysqlDb.getExamRecords();
        announcements = await mysqlDb.getAnnouncements();
      } catch (e) {
        console.warn('[Stats] MySQL query failed, falling back to JSON:', e.message);
        users = await db.getUsers();
        questions = await db.getQuestions();
        papers = await db.getPapers();
        examRecords = await db.getExamRecords();
        announcements = await db.getAnnouncements();
      }
    } else {
      users = await db.getUsers();
      questions = await db.getQuestions();
      papers = await db.getPapers();
      examRecords = await db.getExamRecords();
      announcements = await db.getAnnouncements();
    }

    const pendingGradingCount = examRecords.filter(r => r.status === 'submitted').length;
    const publishedPapers = papers.filter(p => p.status === 'published').length;
    const draftPapers = papers.filter(p => p.status === 'draft').length;
    const activeQuestions = questions.filter(q => q.status === 'active' || q.status === 'published').length;

    const stats = {
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

    writeLog('INFO', `用户 ${req.user.username} 获取了数据统计`);
    res.json({ success: true, data: stats });
  } catch (error) {
    writeErrorLog('获取数据统计失败', error.stack);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/database', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const mysqlStatus = db.getMySQLStatus();
    const { mysqlConnected, useDualWrite, degradedMode, lastSync } = mysqlStatus;

    let syncInProgress = false;
    try {
      const indexPath = path.join(__dirname, '../index.js');
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      const syncMatch = indexContent.match(/syncInProgress\s*=\s*(true|false)/);
      if (syncMatch) {
        syncInProgress = syncMatch[1] === 'true';
      }
    } catch (e) {}

    let dbStats = {
      type: 'unknown',
      status: 'unknown',
      checkedAt: new Date().toISOString(),
      mode: 'json_only',
      mysqlConnected: false,
      degradedMode: false,
      useDualWrite: false,
      lastSync: null,
      syncInProgress
    };

    if (mysqlConnected && useDualWrite) {
      dbStats.mode = 'dual_write';
    } else if (mysqlConnected && !useDualWrite) {
      dbStats.mode = 'mysql_only';
    } else if (degradedMode) {
      dbStats.mode = 'degraded';
    } else {
      dbStats.mode = 'json_only';
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

    writeLog('INFO', `用户 ${req.user.username} 获取了数据库监测信息`);
    res.json({ success: true, data: dbStats });
  } catch (error) {
    writeErrorLog('获取数据库监测信息失败', error.stack);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/database/backup', authenticate, async (req, res) => {
  try {
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

    writeLog('INFO', `用户 ${req.user.username} 创建了数据库备份: ${backupPath}`);
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
  } catch (error) {
    writeErrorLog('数据库备份失败', error.stack);
    res.status(500).json({ success: false, message: '备份失败: ' + error.message });
  }
});

router.get('/logs', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { type = 'all', page = 1, pageSize = 50 } = req.query;
    const logs = [];
    const errorLogs = [];

    if (type === 'all' || type === 'system') {
      try {
        if (fs.existsSync(LOG_FILE)) {
          const content = fs.readFileSync(LOG_FILE, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          errorLogs.push(...lines.slice(-200));
        }
      } catch (e) {}
    }

    if (type === 'all' || type === 'error') {
      try {
        if (fs.existsSync(ERROR_LOG_FILE)) {
          const content = fs.readFileSync(ERROR_LOG_FILE, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          errorLogs.push(...lines.slice(-200));
        }
      } catch (e) {}
    }

    const allLogs = [...errorLogs].reverse();
    const start = (parseInt(page) - 1) * parseInt(pageSize);
    const end = start + parseInt(pageSize);
    const paginatedLogs = allLogs.slice(start, end);

    writeLog('INFO', `用户 ${req.user.username} 查看系统日志`);
    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        total: allLogs.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    writeErrorLog('获取日志失败', error.stack);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/clear-logs', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { type = 'error' } = req.body;

    if (type === 'all' || type === 'error') {
      if (fs.existsSync(ERROR_LOG_FILE)) {
        fs.writeFileSync(ERROR_LOG_FILE, '');
      }
    }

    writeLog('INFO', `用户 ${req.user.username} 清除了${type}日志`);
    res.json({ success: true, message: '日志已清除' });
  } catch (error) {
    writeErrorLog('清除日志失败', error.stack);
    res.status(500).json({ success: false, message: '清除失败' });
  }
});

router.get('/upgrade/check', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const updateScript = require('../scripts/update-script');
    const result = await updateScript.checkForUpdates();

    // 如果检查更新失败但返回了错误信息，仍然返回 200 而不是 500
    if (result.error) {
      writeLog('WARN', `用户 ${req.user.username} 检查更新失败: ${result.error}`);
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

    writeLog('INFO', `用户 ${req.user.username} 检查更新: 当前${result.currentVersion}, 最新${result.latestVersion}`);
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
  } catch (error) {
    writeErrorLog('检查更新失败', error.stack);
    res.status(500).json({ success: false, message: '检查失败' });
  }
});

router.post('/upgrade', authenticate, async (req, res) => {
  try {
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

    writeLog('INFO', `用户 ${req.user.username} 开始升级: ${currentVersion} -> ${version}`);

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
      writeLog('INFO', `用户 ${req.user.username} 升级成功到版本 ${version}`);
      res.json({
        success: true,
        message: '升级成功，请手动重启服务以应用更新',
        requiresRestart: true
      });
    } else {
      writeErrorLog(`用户 ${req.user.username} 升级失败: ${updateResult.message}`);
      res.status(500).json({ success: false, message: updateResult.message });
    }

  } catch (error) {
    writeErrorLog('升级失败', error.stack);
    res.status(500).json({ success: false, message: '升级失败: ' + error.message });
  }
});

function fetchLatestVersion() {
  return new Promise((resolve) => {
    const GITHUB_REPO = 'thishes/trainer-ai-tool';
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'trainer-ai-tool',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          if (release.tag_name) {
            resolve(release.tag_name.replace(/^v/, ''));
          } else {
            resolve('1.0.0');
          }
        } catch (e) {
          resolve('1.0.0');
        }
      });
    });

    req.on('error', () => resolve('1.0.0'));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve('1.0.0');
    });
    req.end();
  });
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
