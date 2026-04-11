// 诊断脚本 - 检查用户权限和数据库连接
const repo = require('./repository');
const config = require('./config');

async function diagnose() {
  console.log('=== 系统诊断开始 ===\n');

  // 1. 检查数据库连接
  console.log('1. 数据库连接状态:');
  console.log('   - MySQL 连接:', repo.isMySQLConnected ? repo.isMySQLConnected() : '未知');
  console.log('   - 当前数据库类型:', process.env.DB_TYPE || 'json');
  console.log('   - DB_HOST:', process.env.DB_HOST || '未设置');
  console.log('   - DB_PORT:', process.env.DB_PORT || '未设置');
  console.log('   - DB_NAME:', process.env.DB_NAME || '未设置');
  console.log('   - DB_USER:', process.env.DB_USER || '未设置');
  console.log();

  // 2. 检查用户
  console.log('2. 用户列表:');
  try {
    const users = await repo.getAllUsers();
    users.forEach(u => {
      console.log(`   - ID: ${u.id}, 用户名: ${u.username}, 角色: ${u.role}, 状态: ${u.status}`);
    });
  } catch (e) {
    console.log('   - 获取用户失败:', e.message);
  }
  console.log();

  // 3. 检查试卷
  console.log('3. 试卷列表:');
  try {
    const papers = await repo.getPapers();
    console.log(`   - 共 ${papers.length} 个试卷`);
    papers.slice(0, 5).forEach(p => {
      console.log(`   - ID: ${p.id}, 标题: ${p.title}, owner_id: ${p.owner_id || p.user_id}`);
    });
  } catch (e) {
    console.log('   - 获取试卷失败:', e.message);
  }
  console.log();

  // 4. 检查文案
  console.log('4. 文案列表:');
  try {
    const promotions = await repo.getPromotions();
    console.log(`   - 共 ${promotions.length} 个文案`);
    promotions.slice(0, 5).forEach(p => {
      console.log(`   - ID: ${p.id}, 标题: ${p.title}, created_by: ${p.created_by}, locked: ${p.locked}`);
    });
  } catch (e) {
    console.log('   - 获取文案失败:', e.message);
  }
  console.log();

  // 5. 检查 getExamRecordsByPaperId 方法
  console.log('5. 检查 getExamRecordsByPaperId 方法:');
  console.log('   - 方法存在:', typeof repo.getExamRecordsByPaperId === 'function' ? '是' : '否');
  console.log();

  console.log('=== 诊断结束 ===');
  process.exit(0);
}

diagnose().catch(e => {
  console.error('诊断失败:', e);
  process.exit(1);
});
