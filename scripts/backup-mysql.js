// scripts/backup-mysql.js - Node.js 版 MySQL 备份脚本
// 可通过 API 触发或 cron 调用
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// 加载 .env
const envPath = path.join(__dirname, '..', 'server', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_NAME = process.env.DB_NAME || 'trainer_ai_tool';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const RETAIN_DAYS = parseInt(process.env.BACKUP_RETAIN_DAYS) || 30;

async function backup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${DB_NAME}_${date}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  const args = [
    '-h', DB_HOST,
    '-P', DB_PORT,
    '-u', DB_USER,
  ];

  if (DB_PASSWORD) {
    // 使用 MYSQL_PWD 环境变量避免命令行暴露密码
    process.env.MYSQL_PWD = DB_PASSWORD;
  }

  args.push(
    '--single-transaction',
    '--routines',
    '--triggers',
    '--add-drop-table',
    DB_NAME
  );

  return new Promise((resolve, reject) => {
    const mysqldump = execFile('mysqldump', args, { maxBuffer: 100 * 1024 * 1024 }, (error) => {
      if (error) {
        reject(error);
        return;
      }
    });

    const gzip = execFile('gzip', [], { maxBuffer: 100 * 1024 * 1024 }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`[Backup] Completed: ${filename} (${sizeMB} MB)`);
      cleanupOldBackups();
      resolve(filepath);
    });

    const output = fs.createWriteStream(filepath);
    mysqldump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(output);
  });
}

function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql.gz'));
  const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;

  let deleted = 0;
  files.forEach(f => {
    const filepath = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(filepath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(filepath);
      deleted++;
    }
  });

  if (deleted > 0) {
    console.log(`[Backup] Cleaned up ${deleted} old backup(s)`);
  }
}

// 命令行调用
if (require.main === module) {
  backup().then(filepath => {
    console.log('[Backup] Success:', filepath);
    process.exit(0);
  }).catch(err => {
    console.error('[Backup] Failed:', err.message);
    process.exit(1);
  });
}

module.exports = { backup };
