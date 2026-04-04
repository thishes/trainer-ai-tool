const fs = require('fs');
const path = require('path');

const logFile = '/tmp/backend-diagnostic.log';

try {
  fs.appendFileSync(logFile, '=== Backend Diagnostic ===\n');
  fs.appendFileSync(logFile, `Time: ${new Date().toISOString()}\n`);
  fs.appendFileSync(logFile, `Node version: ${process.version}\n`);
  fs.appendFileSync(logFile, `Platform: ${process.platform}\n`);
  fs.appendFileSync(logFile, `PID: ${process.pid}\n`);
  fs.appendFileSync(logFile, `CWD: ${process.cwd()}\n`);
  
  // Try to load server/index.js
  const serverPath = path.join(__dirname, 'server', 'index.js');
  fs.appendFileSync(logFile, `Server path: ${serverPath}\n`);
  
  if (fs.existsSync(serverPath)) {
    fs.appendFileSync(logFile, 'Server file exists ✓\n');
  } else {
    fs.appendFileSync(logFile, 'Server file NOT found ✗\n');
  }
  
  // Try to require dotenv
  try {
    require('dotenv');
    fs.appendFileSync(logFile, 'dotenv module loaded ✓\n');
  } catch (e) {
    fs.appendFileSync(logFile, `dotenv module load failed: ${e.message}\n`);
  }
  
  // Try to load config
  try {
    const config = require('./server/config');
    fs.appendFileSync(logFile, `Config loaded ✓\n`);
    fs.appendFileSync(logFile, `JWT_SECRET: ${config.JWT_SECRET ? 'Set' : 'Not set'}\n`);
  } catch (e) {
    fs.appendFileSync(logFile, `Config load failed: ${e.message}\n`);
  }
  
  fs.appendFileSync(logFile, '\nDiagnostic completed.\n');
  
  console.log('Diagnostic completed. Check log file:', logFile);
} catch (e) {
  console.error('Diagnostic failed:', e.message);
  fs.appendFileSync(logFile, `Diagnostic failed: ${e.message}\n`);
}
