#!/bin/bash

# 培训师AI工具 - 一键部署脚本 (Git版)
# 使用 git clone 获取最新代码

echo "========================================="
echo "   培训师AI工具 - Git 一键部署"
echo "========================================="

# 1. 检查并安装 Node.js
if ! command -v node &> /dev/null; then
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 2. 清理旧目录
echo "清理旧目录..."
rm -rf ~/trainer-ai-tool

# 3. 克隆仓库
echo "克隆最新代码..."
cd ~
git clone https://github.com/thishes/trainer-ai-tool.git trainer-ai-tool
cd trainer-ai-tool
git checkout 393b5ec

# 4. 安装依赖
echo "安装依赖..."
npm install
cd client && npm install && cd ..

# 5. 初始化数据库
echo "初始化数据库..."
mkdir -p uploads
if [ ! -f exam.db ]; then
    node -e "
    const Database = require('better-sqlite3');
    const db = new Database('exam.db');
    db.exec(\`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'student',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            type TEXT,
            content TEXT,
            options TEXT,
            answer TEXT,
            explanation TEXT,
            difficulty TEXT,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            time_limit INTEGER,
            password TEXT,
            random_order INTEGER,
            published INTEGER DEFAULT 0,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS paper_questions (
            id TEXT PRIMARY KEY,
            paper_id TEXT,
            question_id TEXT,
            order_num INTEGER
        );
        CREATE TABLE IF NOT EXISTS exams (
            id TEXT PRIMARY KEY,
            paper_id TEXT,
            student_name TEXT,
            start_time DATETIME,
            end_time DATETIME,
            score REAL,
            status TEXT DEFAULT 'in_progress',
            answers TEXT,
            ip_address TEXT
        );
        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    \`);
    const { v4: uuidv4 } = require('uuid');
    db.prepare('INSERT OR IGNORE INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(uuidv4(), 'admin', 'admin123', 'admin');
    console.log('数据库初始化完成');
    "
fi

# 6. 构建前端
echo "构建前端..."
cd client
npm run build
cd ..

# 7. 启动服务
echo ""
echo "========================================="
echo "   启动服务..."
echo "========================================="

# 使用 PM2 或直接运行
if command -v pm2 &> /dev/null; then
    pm2 stop trainer-ai-tool 2>/dev/null || true
    pm2 start server/index.js --name trainer-ai-tool
    pm2 save
    echo "服务已启动: pm2 list 查看"
else
    node server/index.js
fi