const dbJson = require('./db');
const dbMysql = require('./db-mysql');

let mysqlEnabled = false;
let useDualWrite = false;

async function initDatabase() {
  console.log('[DB] Initializing database layer...');

  const mysqlHealthy = await dbMysql.healthCheck();
  if (mysqlHealthy) {
    console.log('[DB] MySQL connection is healthy');
    mysqlEnabled = true;

    try {
      await dbMysql.init();
      console.log('[DB] MySQL initialized successfully');
    } catch (err) {
      console.warn('[DB] MySQL init failed:', err.message);
      mysqlEnabled = false;
    }
  } else {
    console.warn('[DB] MySQL is not available, using JSON storage only');
  }

  if (mysqlEnabled) {
    useDualWrite = process.env.DUAL_WRITE === 'true';
    if (useDualWrite) {
      console.log('[DB] Dual-write mode enabled - changes will be written to both MySQL and JSON');
    } else {
      console.log('[DB] MySQL-only mode - changes will be written to MySQL only');
    }
  }

  return mysqlEnabled;
}

function isMySQLEnabled() {
  return mysqlEnabled && dbMysql.isConnected();
}

function isDualWriteEnabled() {
  return useDualWrite && mysqlEnabled;
}

module.exports = {
  initDatabase,
  isMySQLEnabled,
  isDualWriteEnabled,
  db: dbJson,
  mysql: dbMysql
};