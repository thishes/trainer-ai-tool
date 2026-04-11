// server/utils/response.js - 统一 API 响应格式
// 所有路由应使用这些工具函数返回响应，确保格式一致

/**
 * 成功响应
 * @param {Object} res - Express response 对象
 * @param {*} data - 响应数据
 * @param {string} message - 可选消息
 * @param {number} statusCode - HTTP 状态码，默认 200
 */
function success(res, data = null, message = '', statusCode = 200) {
  const response = { success: true };
  if (message) response.message = message;
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
}

/**
 * 创建成功响应 (201)
 */
function created(res, data = null, message = '创建成功') {
  return success(res, data, message, 201);
}

/**
 * 分页响应
 * @param {Object} res - Express response 对象
 * @param {Array} items - 数据列表
 * @param {number} total - 总数
 * @param {number} page - 当前页
 * @param {number} pageSize - 每页条数
 */
function paginated(res, items, total, page, pageSize) {
  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    }
  });
}

/**
 * 错误响应 - 由 errorHandler 中间件统一处理
 * 路由中应直接 throw AppError 或 next(err)
 * 这里提供便捷的快捷方法用于简单场景
 */
function error(res, message, statusCode = 400, code = 'BAD_REQUEST') {
  return res.status(statusCode).json({
    success: false,
    message,
    code
  });
}

/**
 * 未授权响应
 */
function unauthorized(res, message = '未登录') {
  return res.status(401).json({
    success: false,
    message,
    code: 'UNAUTHORIZED'
  });
}

/**
 * 禁止访问响应
 */
function forbidden(res, message = '无权限') {
  return res.status(403).json({
    success: false,
    message,
    code: 'FORBIDDEN'
  });
}

/**
 * 未找到响应
 */
function notFound(res, message = '资源不存在') {
  return res.status(404).json({
    success: false,
    message,
    code: 'NOT_FOUND'
  });
}

module.exports = {
  success,
  created,
  paginated,
  error,
  unauthorized,
  forbidden,
  notFound
};
