#!/usr/bin/env node
// 测试后端启动
const http = require('http');

console.log('开始测试...');

// 测试 1: 简单 HTTP 服务器
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Test OK');
});

server.listen(3000, 'localhost', () => {
  console.log('✓ HTTP 服务器已在 http://localhost:3000 启动');
  
  // 5 秒后关闭
  setTimeout(() => {
    server.close();
    console.log('测试完成');
    process.exit(0);
  }, 5000);
});

server.on('error', (err) => {
  console.error('✗ 启动失败:', err.message);
  process.exit(1);
});
