#!/bin/bash
# 重启后端服务脚本

echo "=== 重启后端服务 ==="

# 杀死 3000 端口进程
echo "正在停止 3000 端口进程..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# 检查是否成功
if lsof -ti:3000 >/dev/null 2>&1; then
    echo "❌ 无法停止 3000 端口进程"
    exit 1
fi

echo "✓ 3000 端口已释放"

# 启动后端
echo "正在启动后端服务..."
node server/index.js &
BACKEND_PID=$!

# 等待 3 秒检查是否成功启动
sleep 3

if ps -p $BACKEND_PID >/dev/null 2>&1; then
    echo "✓ 后端服务已启动 (PID: $BACKEND_PID)"
    echo "访问地址：http://localhost:3000"
    echo "API 文档：http://localhost:3000/api/api-docs/ui"
    echo ""
    echo "按 Ctrl+C 停止服务"
    wait $BACKEND_PID
else
    echo "❌ 后端服务启动失败"
    exit 1
fi
