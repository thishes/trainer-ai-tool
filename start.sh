#!/bin/bash
# 统一启动脚本 - 同时启动前端和后端

echo "======================================"
echo "  培训师 AI 工具 - 统一启动脚本"
echo "======================================"
echo ""

# 停止所有相关端口的进程
echo "1. 正在停止所有服务..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 1
echo "   ✓ 已停止所有服务"
echo ""

# 检查 3000 端口是否已释放
if lsof -ti:3000 >/dev/null 2>&1; then
    echo "❌ 3000 端口仍被占用，无法启动后端"
    exit 1
fi

# 检查 8080 端口是否已释放
if lsof -ti:8080 >/dev/null 2>&1; then
    echo "❌ 8080 端口仍被占用，无法启动前端"
    exit 1
fi

echo "2. 正在启动后端服务 (端口：3000)..."
# 后端在后台运行
cd /Volumes/共享盘/openclaw/main/projects/trainer-ai-tool
nohup npm run dev > server.log 2>&1 &
BACKEND_PID=$!
echo "   ✓ 后端服务已启动 (PID: $BACKEND_PID)"
echo ""

# 等待后端启动
echo "3. 等待后端服务就绪..."
sleep 5

# 检查后端是否正常启动
if ! lsof -ti:3000 >/dev/null 2>&1; then
    echo "❌ 后端服务启动失败，请查看 server.log"
    cat server.log
    exit 1
fi
echo "   ✓ 后端服务运行正常"
echo ""

echo "4. 正在启动前端服务 (端口：8080)..."
# 前端在另一个后台进程运行
cd /Volumes/共享盘/openclaw/main/projects/trainer-ai-tool/client
nohup npm run dev > ../client.log 2>&1 &
FRONTEND_PID=$!
echo "   ✓ 前端服务已启动 (PID: $FRONTEND_PID)"
echo ""

# 等待前端启动
echo "5. 等待前端服务就绪..."
sleep 5

# 检查前端是否正常启动
if ! lsof -ti:8080 >/dev/null 2>&1; then
    echo "❌ 前端服务启动失败，请查看 client.log"
    cat ../client.log
    kill $BACKEND_PID
    exit 1
fi
echo "   ✓ 前端服务运行正常"
echo ""

echo "======================================"
echo "  ✓ 所有服务启动成功！"
echo "======================================"
echo ""
echo "访问地址:"
echo "  前端：http://localhost:8080"
echo "  后端 API: http://localhost:3000"
echo "  API 文档：http://localhost:3000/api/api-docs/ui"
echo ""
echo "日志文件:"
echo "  后端：server.log"
echo "  前端：client.log"
echo ""
echo "停止服务："
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  或运行：./stop.sh"
echo ""
echo "======================================"

# 保持脚本运行
wait
