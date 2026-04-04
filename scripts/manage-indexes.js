#!/usr/bin/env node
/**
 * 数据库索引管理脚本
 * 用于创建、删除和检查数据库索引
 */

const { createMissingIndexes, dropAllIndexes, generateCreateIndexSQL } = require('./models/indexes');
const { sequelize } = require('./models');

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log(`
数据库索引管理工具

用法：
  node scripts/manage-indexes.js [command]

命令:
  create    创建所有缺失的索引
  drop      删除所有索引 (危险操作!)
  sql       生成创建索引的 SQL 语句
  help      显示此帮助信息

示例:
  node scripts/manage-indexes.js create    # 创建索引
  node scripts/manage-indexes.js sql > indexes.sql  # 导出 SQL 文件
`);
}

/**
 * 生成 SQL 文件内容
 */
function generateSQLFile() {
  const statements = generateCreateIndexSQL();
  let content = `-- 数据库索引创建脚本\n`;
  content += `-- 生成时间：${new Date().toISOString()}\n\n`;
  content += `-- 使用说明:\n`;
  content += `-- 1. 请先备份数据库\n`;
  content += `-- 2. 在生产环境执行前请先在测试环境验证\n`;
  content += `-- 3. 大表创建索引可能需要较长时间，请在低峰期执行\n\n`;

  for (const stmt of statements) {
    content += `-- ${stmt.description}\n`;
    content += `-- 表：${stmt.table}, 索引名：${stmt.indexName}\n`;
    content += `${stmt.sql}\n\n`;
  }

  return content;
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];

  if (!command || command === 'help') {
    showHelp();
    process.exit(0);
  }

  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✓ 数据库连接成功');

    switch (command) {
      case 'create':
        console.log('\n开始创建索引...');
        const result = await createMissingIndexes();
        console.log('\n索引创建完成:');
        console.log(`  ✓ 创建：${result.created.length} 个`);
        console.log(`  - 跳过：${result.skipped.length} 个 (已存在)`);
        if (result.errors.length > 0) {
          console.log(`  ✗ 失败：${result.errors.length} 个`);
          result.errors.forEach(err => {
            console.log(`    - ${err.indexName}: ${err.error}`);
          });
        }
        break;

      case 'drop':
        console.warn('\n⚠️  警告：即将删除所有索引！此操作不可逆！');
        console.warn('确定要继续吗？(y/N)');
        
        // 简单确认
        const answer = process.argv[3];
        if (answer !== 'y' && answer !== 'Y') {
          console.log('操作已取消');
          process.exit(0);
        }

        const dropResult = await dropAllIndexes();
        console.log('\n索引删除完成:');
        console.log(`  ✓ 删除：${dropResult.dropped.length} 个`);
        if (dropResult.errors.length > 0) {
          console.log(`  ✗ 失败：${dropResult.errors.length} 个`);
        }
        break;

      case 'sql':
        console.log(generateSQLFile());
        break;

      default:
        console.error(`未知命令：${command}`);
        showHelp();
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error.message);
    process.exit(1);
  }
}

main();
