# 数据库表结构统一规范

## 📋 概述
本项目存在两套数据定义：
- `server/database.sql` - 原始SQL建表语句（用于初始化）
- `server/models/index.js` - Sequelize ORM模型（用于业务逻辑）

## ⚠️ 已发现的不一致项

### 1. users 表索引差异
| 索引 | database.sql | models/index.js |
|------|-------------|-----------------|
| phone UNIQUE | ❌ 无 | ✅ 有 |

**建议**: 统一添加 phone 字段的唯一约束，确保手机号唯一性。

### 2. 索引策略不一致
**database.sql** 采用最小化索引：
```sql
INDEX idx_username (username),
INDEX idx_wechat_openid (wechat_openid)
```

**models/index.js** 采用更全面的索引：
```javascript
indexes: [
  { fields: ['username'], unique: true },
  { fields: ['phone'], unique: true },
  { fields: ['wechat_openid'], unique: true },
  { fields: ['role', 'status'] },          // 复合索引
  { fields: ['created_at'] }               // 时间排序
]
```

**建议**: 以 models/index.js 为准，更新 database.sql。

### 3. questions 表缺少 type 和 difficulty 索引
**models/index.js** 有这两个字段的索引，但 **database.sql** 缺失。

## ✅ 推荐的统一方案

### 方案A：使用 Sequelize Migrations（推荐）
```bash
# 安装 sequelize-cli
npm install --save-dev sequelize-cli

# 初始化配置
npx sequelize-cli init

# 从现有模型生成迁移文件
npxsequelize-cli migration:generate --name unify_schema
```

**优点**:
- 版本化管理 DDL 变更
- 支持回滚 (down 方法)
- 团队协作友好

### 方案B：手动同步 database.sql
将 `database.sql` 更新为与 `models/index.js` 完全一致：

```sql
-- users 表补充索引
ALTER TABLE users ADD UNIQUE INDEX idx_phone (phone);

-- questions 表补充索引
ALTER TABLE questions ADD INDEX idx_type (type);
ALTER TABLE questions ADD INDEX idx_difficulty (difficulty);
ALTER TABLE questions ADD INDEX idx_user_category_status (user_id, category_id, status);
```

## 🔧 迁移步骤

1. **备份数据库**
   ```bash
   mysqldump -u root -p trainer_ai_tool > backup_$(date +%Y%m%d).sql
   ```

2. **执行同步脚本**
   ```sql
   -- 文件路径: server/sql/sync-indexes.sql
   source server/sql/sync-indexes.sql
   ```

3. **验证**
   ```sql
   SHOW INDEX FROM users;
   SHOW INDEX FROM questions;
   ```

4. **删除冗余文件**
   - 保留 `server/models/index.js` 作为权威数据源
   - 将 `server/database.sql` 标记为 deprecated 或仅用于初始安装

## 📝 后续维护规范

1. **新增表/字段**: 只修改 `models/index.js`
2. **生成迁移**: 使用 `sequelize-cli migration:generate`
3. **部署流程**: `npx sequelize-cli db:migrate`
4. **禁止**: 直接修改 `database.sql`（除非是全新环境初始化）

## 🎯 长期目标

- [ ] 完全移除 `database.sql`，改用 migrations 管理
- [ ] 添加数据校验约束（CHECK、FOREIGN KEY）
- [ ] 实现读写分离（如果需要）
- [ ] 添加审计日志触发器

---
**创建时间**: 2026-04-23  
**负责人**: AI Code Reviewer  
**状态**: 待实施
