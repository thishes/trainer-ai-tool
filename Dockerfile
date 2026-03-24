FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装后端依赖
RUN npm install

# 复制前端文件
COPY client/ ./client/

# 安装前端依赖
WORKDIR /app/client
RUN npm install

# 返回主目录
WORKDIR /app

# 复制后端代码
COPY server/ ./server/

# 复制其他必要文件
COPY .env.example ./

# 安装 nodemon 用于开发
RUN npm install -g nodemon

# 暴露端口
EXPOSE 3000 8080

# 同时启动后端和前端
CMD sh -c "node server/index.js & cd client && npm run dev -- --host 0.0.0.0"
