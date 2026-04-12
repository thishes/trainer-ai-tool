#!/bin/bash
# 重启服务器脚本 - 开发环境

echo "=== 正在重启服务器（开发环境）==="

# 1. 找到并终止现有 Node 进程
echo "1. 停止现有服务器进程..."
pkill -f "node server/index.js" 2>/dev/null || true
sleep 2

# 2. 验证进程已停止
if pgrep -f "node server/index.js" > /dev/null; then
    echo "   - 强制终止进程..."
    pkill -9 -f "node server/index.js" 2>/dev/null || true
fi

# 3. 清除 require 缓存（重要）
echo "2. 清理缓存..."
cd "$(dirname "$0")/server"

# 4. 重新启动服务器
echo "3. 启动服务器..."
echo "   - 工作目录: $(pwd)"
echo "   - 环境文件: $(pwd)/.env"

cd "$(dirname "$0")"
node server/index.js > logs/server.log 2>&1 &

sleep 5

# 5. 检查启动状态
if pgrep -f "node server/index.js" > /dev/null; then
    echo "✅ 服务器启动成功！"
    echo "   - 访问地址: http://localhost:3000"
    echo "   - 开发模式: 已启用"

    # 检查 MySQL 连接
    sleep 2
    if grep -q "MySQL.*connected\|Database connection established" logs/server.log 2>/dev/null; then
        echo "   - MySQL 远程: ✅ 已连接"
    else
        echo "   - MySQL 远程: ⚠️  检查中..."
    fi
else
    echo "❌ 服务器启动失败，请检查日志"
    echo "   - 查看日志: tail -f logs/error.log"
fi

echo ""
echo "提示: 使用 'tail -f logs/error.log' 查看错误日志"
