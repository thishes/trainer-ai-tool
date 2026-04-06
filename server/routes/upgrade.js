const express = require('express');
const router = express.Router();
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const authenticate = require('../middleware/auth');

function getCurrentVersion() {
  try {
    const packagePath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version || '1.0.0';
    }
  } catch (e) {
    console.error('读取版本失败:', e.message);
  }
  return '1.0.0';
}

const GITHUB_REPO = 'thishes/trainer-ai-tool';

router.get('/check', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const currentVersion = getCurrentVersion();
    const latestVersion = await fetchLatestVersion();
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    res.json({
      success: true,
      data: {
        currentVersion: currentVersion,
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

    try {
      console.log('开始升级到版本:', version);

      execSync('git fetch origin', { cwd: projectRoot, stdio: 'pipe' });

      const tags = execSync('git tag -l', { cwd: projectRoot, encoding: 'utf8' });
      console.log('现有标签:', tags);

      const currentBranch = execSync('git branch --show-current', { cwd: projectRoot, encoding: 'utf8' }).trim();
      console.log('当前分支:', currentBranch);

      try {
        execSync(`git checkout tags/v${version}`, { cwd: projectRoot, stdio: 'pipe' });
        console.log('已切换到标签 v' + version);
      } catch (tagErr) {
        console.log('标签不存在，尝试直接拉取:', tagErr.message);
        execSync(`git pull origin ${currentBranch}`, { cwd: projectRoot, stdio: 'pipe' });
      }

      const packagePath = path.join(projectRoot, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        packageJson.version = version;
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      }

      console.log('升级成功');
      res.json({ success: true, message: '升级成功，请重启服务' });

    } catch (gitErr) {
      console.error('Git操作失败:', gitErr.message);

      const packagePath = path.join(projectRoot, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        packageJson.version = version;
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      }

      res.json({ success: true, message: '版本已更新，Git操作跳过（可能无权限），请手动拉取最新代码' });
    }

  } catch (error) {
    console.error('升级失败:', error);
    res.status(500).json({ success: false, message: '升级失败' });
  }
});

function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'trainer-ai-tool',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const DEBUG = process.env.DEBUG === 'true';

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (DEBUG) console.log('GitHub API响应状态:', res.statusCode);
        if (DEBUG) console.log('GitHub API响应数据:', data.substring(0, 500));
        try {
          const release = JSON.parse(data);
          if (release.tag_name) {
            const version = release.tag_name.replace(/^v/, '');
            if (DEBUG) console.log('解析版本号:', version);
            resolve(version);
          } else if (release.message) {
            if (DEBUG) console.log('GitHub API错误:', release.message);
            resolve(getCurrentVersion());
          } else {
            if (DEBUG) console.log('无法获取tag_name，使用当前版本');
            resolve(getCurrentVersion());
          }
        } catch (e) {
          console.error('解析GitHub响应失败:', e.message);
          resolve(getCurrentVersion());
        }
      });
    });

    req.on('error', (e) => {
      console.error('GitHub API请求失败:', e.message);
      resolve(getCurrentVersion());
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

module.exports = router;
