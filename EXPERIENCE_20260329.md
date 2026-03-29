# 培训师小助手 - 开发经验总结

## 日期：2026-03-29

---

## 1. 数据库关联删除问题

### 问题描述
删除用户时，需要级联删除多个关联表的数据，包括：
- papers（试卷）
- questions（题目）
- categories（分类）
- examRecords（考试记录）
- paperStudents（试卷考生关联）
- scoreRecords（成绩记录）
- paperQuestions（试卷题目关联）

### 解决方案
使用 `deleteWithKeyIds` 函数统一处理需要同时检查 `user_id` 和 `paper_key_id` 的表：

```javascript
const deleteWithKeyIds = (table, keyIds) => {
  if (keyIds.length === 0) {
    db[table] = db[table].filter(row => row.user_id !== userId);
  } else {
    db[table] = db[table].filter(row => {
      if (row.user_id === userId) return false;
      const rowKeyId = row.paper_key_id;
      if (rowKeyId && keyIds.includes(rowKeyId)) return false;
      return true;
    });
  }
};
```

### 经验
- 级联删除时，需要同时考虑直接关联（user_id）和间接关联（paper_key_id）
- 提取公共函数减少代码重复
- 提前返回错误情况，减少嵌套层级

---

## 2. 混合 ID 系统兼容性

### 问题描述
examRecord 中同时存在 `paper_id` 和 `paper_key_id` 字段，但某些旧数据的 `paper_id` 为 null，导致查找试卷失败。

### 解决方案
支持两种方式查找试卷：

```javascript
let paper;
if (examRecord.paper_id) {
  paper = db.papers.findById(examRecord.paper_id);
} else if (examRecord.paper_key_id) {
  paper = db.papers.findByKeyId(examRecord.paper_key_id);
}
```

### 经验
- 迁移期间需要保持向后兼容
- 优先使用稳定的唯一标识（key_id）
- 添加详细的日志输出便于调试

---

## 3. key_id 系统设计

### 设计原则
- 使用 `prefix + timestamp + random` 格式生成唯一标识
- 例如：`PMNBWVYN8CEE03B54`（试卷）、`EMNBWXBS6147E51F7`（考试记录）
- key_id 作为跨表关联的主要标识

### 表关联方式
| 表名 | 关联字段 | 说明 |
|------|----------|------|
| paperQuestions | paper_key_id, question_key_id | 试卷与题目关联 |
| examRecords | paper_key_id | 考试记录关联试卷 |
| paperStudents | paper_key_id | 考生与试卷关联 |
| scoreRecords | paper_key_id | 成绩与试卷关联 |

---

## 4. 前端部署同步问题

### 问题描述
前端构建后，资源文件哈希值变化，但服务器上的 index.html 未同步更新，导致 404 错误。

### 解决方案
部署流程：
1. 本地构建：`npm run build`
2. 同步资源：`scp -r dist/assets/* root@server:/var/www/.../assets/`
3. 同步入口：`scp dist/index.html root@server:/var/www/.../`
4. 重启nginx：`nginx -s reload`

### 经验
- 使用哈希命名的资源需要同步更新 index.html
- 每次部署前先清理旧资源避免冲突
- 使用脚本自动化部署流程

---

## 5. Logo 和 UI 更新

### 问题
- 登录页和侧边栏的 Logo 使用 SVG，需要改为图片
- 蓝色背景框需要移除

### 解决方案
```vue
<!-- 替换 SVG 为图片 -->
<img src="/logo.png" alt="logo" style="width: 80px; height: 80px; object-fit: contain;" />

<!-- CSS 移除背景色 -->
.logo-icon {
  background: transparent; /* 移除 var(--color-primary) */
}
```

---

## 6. 服务器进程管理

### 问题
多次重启后出现 `EADDRINUSE` 错误，端口被占用。

### 解决方案
```bash
# 强制终止所有 node 进程
pkill -9 node

# 然后重启
cd /root/trainer-ai-tool/server && node index.js > server.log 2>&1 &
```

### 经验
- 使用 `lsof -i :3000` 检查端口占用
- 日志文件需要定期清理避免占用过多磁盘
- 建议使用 PM2 等进程管理工具

---

## 7. 关键文件路径

### 本地
- 客户端：`/Volumes/共享盘/openclaw/main/projects/trainer-ai-tool/client/`
- 服务端：`/Volumes/共享盘/openclaw/main/projects/trainer-ai-tool/server/`

### 服务器
- Web目录：`/var/www/knowledge-base/`
- 服务目录：`/root/trainer-ai-tool/server/`
- 日志文件：`/root/trainer-ai-tool/server.log`

---

## 8. API 端点说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/exam/:id/questions` | GET | 获取考试题目 |
| `/api/papers` | GET | 获取试卷列表 |
| `/api/papers/:id` | DELETE | 删除试卷 |
| `/api/users/:id` | DELETE | 删除用户 |

---

## 9. 常见错误处理

### 500 Internal Server Error
- 检查服务器日志：`cat /root/trainer-ai-tool/server.log`
- 确认数据库文件完整性
- 验证所有必需字段是否存在

### 404 Not Found
- 确认资源文件已正确部署
- 检查 Nginx 配置
- 验证 index.html 引用路径正确

### EADDRINUSE
- 使用 `pkill -9 node` 终止所有 node 进程
- 等待 2-3 秒后重新启动

---

## 10. 最佳实践

1. **数据迁移**：新旧系统共存时，保持 ID 和 key_id 双向兼容
2. **日志记录**：关键操作添加 console.log 便于远程调试
3. **部署验证**：每次部署后验证关键 API 是否正常
4. **错误处理**：在 catch 块中记录详细错误信息
5. **缓存清理**：重要更新后通知用户使用隐身模式刷新
