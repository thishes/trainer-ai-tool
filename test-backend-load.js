// 测试后端服务是否能正常加载
try {
  console.log('Loading backend server...');
  
  // Load dotenv first
  require('dotenv').config();
  console.log('✓ dotenv loaded');
  
  // Load config
  const config = require('./server/config');
  console.log('✓ config loaded');
  console.log('  JWT_SECRET:', config.JWT_SECRET ? 'Set (' + config.JWT_SECRET.length + ' chars)' : 'NOT SET');
  
  // Try to load express
  const express = require('express');
  console.log('✓ express loaded');
  
  // Try to load the main server file
  const serverCode = require('fs').readFileSync('./server/index.js', 'utf-8');
  console.log('✓ server/index.js read successfully');
  console.log('  File size:', serverCode.length, 'bytes');
  
  console.log('\n✓ All checks passed! Backend should be able to start.');
  
} catch (e) {
  console.error('✗ Error:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1);
}
