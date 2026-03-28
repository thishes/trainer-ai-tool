#!/bin/bash
# deploy.sh - 远程部署脚本
# 用法: ./deploy.sh <服务器IP> <用户名> <前端路径> <后端路径>

set -e

SERVER_IP="${1:-43.153.192.88}"
SERVER_USER="${2:-root}"
FRONTEND_PATH="${3:-/var/www/knowledge-base}"
BACKEND_PATH="${4:-/root/trainer-ai-tool}"
DOMAIN="${5:-kb.thishe.com}"
SSH_PORT="${SSH_PORT:-22}"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATE=$(date +%Y%m%d%H%M%S)

echo "=========================================="
echo "开始部署 Trainer AI Tool"
echo "服务器: ${SERVER_USER}@${SERVER_IP}"
echo "前端路径: ${FRONTEND_PATH}"
echo "后端路径: ${BACKEND_PATH}"
echo "域名: ${DOMAIN}"
echo "时间: ${DATE}"
echo "=========================================="

# 1. 打包项目
echo "[1/6] 打包项目..."
cd "$PROJECT_DIR"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='client/dist' \
    --exclude='*.log' \
    -czf "/tmp/trainer-ai-tool-${DATE}.tar.gz" .

# 2. 上传到服务器
echo "[2/6] 上传到服务器..."
scp -P ${SSH_PORT} "/tmp/trainer-ai-tool-${DATE}.tar.gz" ${SERVER_USER}@${SERVER_IP}:/tmp/

# 3. 备份旧版本
echo "[3/6] 备份旧版本..."
ssh -p ${SSH_PORT} ${SERVER_USER}@${SERVER_IP} "
    if [ -d '${BACKEND_PATH}' ]; then
        echo '备份后端...'
        mkdir -p /tmp/backup
        cp -r ${BACKEND_PATH} /tmp/backup/trainer-ai-tool-${DATE} 2>/dev/null || true
    fi
"

# 4. 部署后端
echo "[4/6] 部署后端..."
ssh -p ${SSH_PORT} ${SERVER_USER}@${SERVER_IP} "
    mkdir -p ${BACKEND_PATH}
    tar -xzf /tmp/trainer-ai-tool-${DATE}.tar.gz -C ${BACKEND_PATH}
    cd ${BACKEND_PATH}
    
    # 安装依赖
    npm install --production 2>/dev/null || true
    
    # 重启后端服务
    pm2 stop trainer-ai-tool 2>/dev/null || true
    pm2 start npm --name 'trainer-ai-tool' -- start || true
    pm2 save 2>/dev/null || true
"

# 5. 部署前端
echo "[5/6] 部署前端..."
ssh -p ${SSH_PORT} ${SERVER_USER}@${SERVER_IP} "
    mkdir -p ${FRONTEND_PATH}
    cd ${BACKEND_PATH}/client
    
    # 构建前端
    npm install 2>/dev/null || true
    npm run build 2>/dev/null || true
    
    # 复制到前端目录
    rm -rf ${FRONTEND_PATH}/*
    cp -r ${BACKEND_PATH}/client/dist/* ${FRONTEND_PATH}/
    
    # 配置 Nginx
    cat > /etc/nginx/sites-available/${DOMAIN} << 'NGINX_EOF'
server {
    listen 80;
    server_name ${DOMAIN};

    root ${FRONTEND_PATH};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF

    ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/ 2>/dev/null || true
    
    # 测试并重载 Nginx
    nginx -t && nginx -s reload 2>/dev/null || true
"

# 6. 清理
echo "[6/6] 清理临时文件..."
ssh -p ${SSH_PORT} ${SERVER_USER}@${SERVER_IP} "rm -f /tmp/trainer-ai-tool-${DATE}.tar.gz"
rm -f "/tmp/trainer-ai-tool-${DATE}.tar.gz"

echo ""
echo "=========================================="
echo "部署完成！"
echo "访问地址: http://${DOMAIN}"
echo "=========================================="
