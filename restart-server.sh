#!/bin/bash
# 重启服务器脚本

echo "=== 正在重启服务器 ==="

# 1. 找到并终止现有 Node 进程
echo "1. 停止现有服务器进程..."
pkill -f "node server/index.js" 2>/dev/null || true
sleep 2

# 2. 验证进程已停止
if pgrep -f "node server/index.js" > /dev/null; then
    echo "   - 强制终止进程..."
    pkill -9 -f "node server/index.js" 2>/dev/null || true
fi

# 3. 重新启动服务器
echo "2. 启动服务器..."
cd "$(dirname "$0")"
npm start &

sleep 3

# 4. 检查启动状态
if pgrep -f "node server/index.js" > /dev/null; then
    echo "✅ 服务器启动成功！"
    echo "   - 访问地址: http://localhost:3000"
else
    echo "❌ 服务器启动失败，请检查日志"
fi

echo ""
echo "提示: 使用 'tail -f logs/error.log' 查看错误日志"
