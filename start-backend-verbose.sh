#!/bin/bash
# 后端服务启动脚本（带日志输出）

LOG_FILE="/tmp/backend-startup.log"
PID_FILE="/tmp/backend.pid"

cd "$(dirname "$0")"

{
  echo "=== 后端服务启动 ===" 
  echo "时间：$(date)"
  echo "当前目录：$(pwd)"
  echo "Node 版本：$(node --version)"
  echo "npm 版本：$(npm --version)"
  echo ""
  
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
  else
    echo ".env 文件已存在"
  fi
  echo ""
  
  # 启动后端
  echo "启动后端服务..."
  node server/index.js &
  BACKEND_PID=$!
  echo "后端进程 PID: $BACKEND_PID"
  echo $BACKEND_PID > $PID_FILE
  
  # 等待后端启动
  sleep 3
  
  # 检查后端是否还在运行
  if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "✓ 后端服务启动成功"
  else
    echo "✗ 后端服务启动失败"
  fi
  
} > "$LOG_FILE" 2>&1

echo "启动日志已写入：$LOG_FILE"
cat "$LOG_FILE"
