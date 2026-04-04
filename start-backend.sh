#!/bin/bash
# 后端服务启动脚本

cd "$(dirname "$0")"

echo "=== 启动后端服务 ==="
echo "当前目录：$(pwd)"
echo "Node 版本：$(node --version)"
echo "npm 版本：$(npm --version)"

# 检查 .env 文件
if [ ! -f ".env" ]; then
  echo "创建 .env 文件..."
  cat > .env << EOF
JWT_SECRET=this-is-a-very-secret-key-for-jwt-signing-and-verification-2024
DEBUG=true
NODE_ENV=development
PORT=3000
HOST=localhost
EOF
  echo ".env 文件已创建"
fi

# 启动后端
echo "启动后端服务..."
exec node server/index.js
