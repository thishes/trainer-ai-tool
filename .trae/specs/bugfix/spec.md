# Bug修复规格文档

## 问题1: 试卷列表不显示

### 原因分析
- **本地测试API正常**: 返回 `{"success":true,"data":{"list":[...]}}`
- **可能原因**: Vite开发服务器代理未正确工作

### 修复方案
修改 `vite.config.js`，添加 socket.io 代理：
```javascript
proxy: {
  '/api': { target: 'http://localhost:3000', changeOrigin: true },
  '/socket.io': { target: 'http://localhost:3000', ws: true }
}
```

---

## 问题2: 用户中心数据为空

### 原因分析
- **API `/auth/me` 正常**: 返回用户信息
- **可能原因**: Token未正确传递到用户中心页面

### 修复方案
1. 检查Profile页面路由守卫
2. 确认localStorage中token存在

---

## 问题3: CSP字体加载错误

### 原因分析
- **Nginx CSP配置限制**: `font-src 'self'` 不允许 data:字体

### 修复方案
修改生产环境Nginx配置：
```nginx
add_header Content-Security-Policy "font-src 'self' data:;";
```

---

## 确认修复

请确认是否执行以上修复方案？
