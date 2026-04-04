#!/bin/bash
# 停止所有服务脚本

echo "正在停止所有服务..."

# 停止 3000 端口进程（后端）
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✓ 已停止后端服务 (3000 端口)" || echo "- 后端服务未运行"

# 停止 8080 端口进程（前端）
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "✓ 已停止前端服务 (8080 端口)" || echo "- 前端服务未运行"

# 停止 3001 端口进程
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "✓ 已停止 3001 端口服务" || echo "- 3001 端口服务未运行"

echo "所有服务已停止"
