// server/middleware/slowQuery.js - 慢查询监控中间件
const config = require('../config');

/**
 * 慢查询监控中间件
 * 记录执行时间超过阈值的数据库查询
 */
function slowQueryMonitor() {
  return (req, res, next) => {
    const start = Date.now();

    // 监听响应结束事件
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      if (duration > config.SLOW_QUERY_THRESHOLD) {
        console.warn('⚠️ 慢查询警告');
        console.warn(`  路径：${req.originalUrl || req.url}`);
        console.warn(`  方法：${req.method}`);
        console.warn(`  耗时：${duration}ms`);
        console.warn(`  阈值：${config.SLOW_QUERY_THRESHOLD}ms`);
        console.warn(`  用户：${req.user?.id || '未认证'}`);
        console.warn(`  IP: ${req.ip || req.connection.remoteAddress}`);
        console.warn('---');
      }
    });

    next();
  };
}

/**
 * 数据库查询性能监控
 * 包装 Sequelize 查询方法，记录慢查询
 */
function monitorQueryPerformance(sequelize) {
  const originalQuery = sequelize.query;
  
  sequelize.query = async function(sql, options) {
    const start = Date.now();
    
    try {
      const result = await originalQuery.call(this, sql, options);
      const duration = Date.now() - start;
      
      if (duration > config.SLOW_QUERY_THRESHOLD) {
        console.warn('⚠️ 数据库慢查询');
        console.warn(`  SQL: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`);
        console.warn(`  耗时：${duration}ms`);
        console.warn(`  阈值：${config.SLOW_QUERY_THRESHOLD}ms`);
        console.warn('---');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('❌ 查询错误');
      console.error(`  SQL: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`);
      console.error(`  耗时：${duration}ms`);
      console.error(`  错误：${error.message}`);
      throw error;
    }
  };
}

module.exports = {
  slowQueryMonitor,
  monitorQueryPerformance
};
