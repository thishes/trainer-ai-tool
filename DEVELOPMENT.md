# 开发规范

## 环境配置

### 开发环境
- **前端**: http://localhost:8080 (npm run dev)
- **后端**: http://localhost:3000 (node server/index.js)

### 生产环境
- **前端**: https://kb.thishe.com (Nginx静态)
- **后端**: https://kb.thishe.com (Node.js + Nginx代理)

## 开发流程

### 1. 本地开发
```bash
# 终端1: 启动后端
cd server && node index.js

# 终端2: 启动前端
cd client && npm run dev
```

### 2. 测试验证
- 本地测试: http://localhost:8080
- 后端API: http://localhost:3000/api/...

### 3. 构建部署
```bash
# 构建前端
cd client && npm run build

# 部署到生产 (手动或CI/CD)
# 禁止直接修改生产服务器代码！
```

## 注意事项

⚠️ **禁止直接连接生产服务器修改代码**
- 所有修改必须在本地完成
- 测试通过后再部署到生产
