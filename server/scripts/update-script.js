#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const GITHUB_REPO = process.env.GITHUB_REPO || 'thishes/trainer-ai-tool';
const CURRENT_VERSION = require('../package.json').version;
const UPDATE_DIR = path.join(__dirname, '../updates');
const BACKUP_DIR = path.join(__dirname, '../backups');
const LOG_FILE = path.join(__dirname, '../logs/update.log');

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logEntry.trim());
  try {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (e) {
    console.error('Failed to write log:', e.message);
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    log(`Downloading ${url} to ${dest}`);

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        file.close();
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function extractTarGz(tarPath, destDir) {
  ensureDir(destDir);
  log(`Extracting ${tarPath} to ${destDir}`);
  try {
    execSync(`tar -xzf "${tarPath}" -C "${destDir}"`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    log(`Extraction failed: ${error.message}`, 'ERROR');
    return false;
  }
}

function backupCurrent() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
  ensureDir(BACKUP_DIR);
  ensureDir(backupPath);

  log(`Creating backup at ${backupPath}`);

  const dirsToBackup = ['client/dist', 'server', 'package.json', 'package-lock.json'];

  for (const dir of dirsToBackup) {
    const src = path.join(__dirname, '..', dir);
    const dest = path.join(backupPath, dir);
    if (fs.existsSync(src)) {
      const destDir = path.dirname(dest);
      ensureDir(destDir);
      if (fs.statSync(src).isDirectory()) {
        execSync(`cp -r "${src}" "${dest}"`);
      } else {
        ensureDir(path.dirname(dest));
        fs.copyFileSync(src, dest);
      }
    }
  }

  const backupInfo = {
    version: CURRENT_VERSION,
    timestamp,
    path: backupPath
  };

  fs.writeFileSync(
    path.join(backupPath, 'backup-info.json'),
    JSON.stringify(backupInfo, null, 2)
  );

  return backupPath;
}

function restoreBackup(backupPath) {
  log(`Restoring from backup ${backupPath}`);
  const projectRoot = path.join(__dirname, '..');

  const items = fs.readdirSync(backupPath);
  for (const item of items) {
    if (item === 'backup-info.json') continue;
    const src = path.join(backupPath, item);
    const dest = path.join(projectRoot, item);
    if (fs.existsSync(dest)) {
      if (fs.statSync(dest).isDirectory()) {
        execSync(`rm -rf "${dest}"`);
      } else {
        fs.unlinkSync(dest);
      }
    }
    if (fs.statSync(src).isDirectory()) {
      execSync(`cp -r "${src}" "${dest}"`);
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  log('Backup restored successfully');
}

function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'trainer-ai-tool-update-script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          resolve({
            tag: release.tag_name?.replace(/^v/, '') || '0.0.0',
            version: release.tag_name?.replace(/^v/, '') || '0.0.0',
            name: release.name || '',
            body: release.body || '',
            publishedAt: release.published_at,
            downloadUrl: release.assets?.find(a => a.name.endsWith('.tar.gz'))?.browser_download_url
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
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

async function performUpdate(version, downloadUrl) {
  log(`Starting update to version ${version}`);

  const updateDir = path.join(UPDATE_DIR, `update-${version}`);
  ensureDir(updateDir);

  let downloadedFile = null;

  try {
    if (downloadUrl) {
      downloadedFile = path.join(updateDir, 'update.tar.gz');
      await downloadFile(downloadUrl, downloadedFile);
    } else {
      const tagUrl = `https://api.github.com/repos/${GITHUB_REPO}/tarball/v${version}`;
      downloadedFile = path.join(updateDir, 'update.tar.gz');
      await downloadFile(tagUrl, downloadedFile);
    }

    const extractDir = path.join(updateDir, 'extracted');
    if (!extractTarGz(downloadedFile, extractDir)) {
      throw new Error('Failed to extract update package');
    }

    log('Creating backup of current version...');
    const backupPath = backupCurrent();

    log('Installing update...');
    const projectRoot = path.join(__dirname, '..');
    const extractedContent = fs.readdirSync(extractDir)[0];
    const extractedPath = path.join(extractDir, extractedContent);

    const items = fs.readdirSync(extractedPath);
    for (const item of items) {
      if (item === '.git' || item === 'node_modules') continue;
      const src = path.join(extractedPath, item);
      const dest = path.join(projectRoot, item);
      if (fs.existsSync(dest)) {
        if (fs.statSync(dest).isDirectory()) {
          execSync(`rm -rf "${dest}"`);
        } else {
          fs.unlinkSync(dest);
        }
      }
      if (fs.statSync(src).isDirectory()) {
        execSync(`cp -r "${src}" "${dest}"`);
      } else {
        fs.copyFileSync(src, dest);
      }
    }

    log('Installing dependencies...');
    execSync('npm install --production', {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    log(`Update to version ${version} completed successfully!`);

    try {
      fs.rmSync(updateDir, { recursive: true, force: true });
    } catch (e) {}

    return { success: true, message: 'Update completed successfully. Please restart the server.' };

  } catch (error) {
    log(`Update failed: ${error.message}`, 'ERROR');

    try {
      const backupDirs = fs.readdirSync(BACKUP_DIR).sort();
      if (backupDirs.length > 0) {
        const latestBackup = path.join(BACKUP_DIR, backupDirs[backupDirs.length - 1]);
        log('Attempting to restore from backup...');
        restoreBackup(latestBackup);
      }
    } catch (restoreError) {
      log(`Backup restoration failed: ${restoreError.message}`, 'ERROR');
    }

    return { success: false, message: `Update failed: ${error.message}` };
  }
}

async function checkForUpdates() {
  try {
    const latest = await getLatestRelease();
    const hasUpdate = compareVersions(latest.version, CURRENT_VERSION) > 0;

    return {
      currentVersion: CURRENT_VERSION,
      latestVersion: latest.version,
      hasUpdate,
      releaseInfo: latest
    };
  } catch (error) {
    log(`Failed to check for updates: ${error.message}`, 'ERROR');
    return {
      currentVersion: CURRENT_VERSION,
      latestVersion: null,
      hasUpdate: false,
      error: error.message
    };
  }
}

module.exports = {
  checkForUpdates,
  performUpdate,
  log
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    switch (command) {
      case 'check':
        const checkResult = await checkForUpdates();
        console.log(JSON.stringify(checkResult, null, 2));
        break;

      case 'update':
        const version = args[1] || 'latest';
        const result = await performUpdate(version);
        console.log(JSON.stringify(result, null, 2));
        break;

      default:
        console.log(`
Usage: node update-script.js [command]

Commands:
  check              Check for available updates
  update [version]    Update to specified version or latest

Examples:
  node update-script.js check
  node update-script.js update
  node update-script.js update 1.0.4
        `);
    }
  })();
}