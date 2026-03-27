const express = require('express');
const router = express.Router();
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const authenticate = require('../middleware/auth');

const CURRENT_VERSION = '1.0.0';
const GITHUB_REPO = 'trainer-ai-tool';

router.get('/check', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const latestVersion = await fetchLatestVersion();
    const hasUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0;

    res.json({
      success: true,
      data: {
        currentVersion: CURRENT_VERSION,
        latestVersion: latestVersion,
        hasUpdate: hasUpdate
      }
    });
  } catch (error) {
    console.error('检查版本失败:', error);
    res.status(500).json({ success: false, message: '检查版本失败' });
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

    const projectRoot = path.join(__dirname, '../../');
    const packagePath = path.join(projectRoot, 'package.json');

    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      packageJson.version = version;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    }

    res.json({ success: true, message: '版本更新成功，请重启服务' });
  } catch (error) {
    console.error('升级失败:', error);
    res.status(500).json({ success: false, message: '升级失败' });
  }
});

function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/thishe/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'trainer-ai-tool'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          resolve(release.tag_name ? release.tag_name.replace(/^v/, '') : '1.0.0');
        } catch (e) {
          resolve(CURRENT_VERSION);
        }
      });
    });

    req.on('error', () => resolve(CURRENT_VERSION));
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

module.exports = router;
