// 简化的后端启动脚本
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器已启动在 http://localhost:${PORT}`);
  console.log('健康检查：http://localhost:3000/api/health');
});
