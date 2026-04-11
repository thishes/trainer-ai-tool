// server/middleware/auth.js - 认证与权限中间件
const jwt = require('jsonwebtoken');
const config = require('../config');
const resp = require('../utils/response');

const JWT_SECRET = config.JWT_SECRET;
if (!JWT_SECRET && config.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 环境变量未设置');
}

/**
 * 认证中间件 - 验证 JWT Token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录', code: 'NO_TOKEN' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'token已过期', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'token无效', code: 'INVALID_TOKEN' });
    }
    return res.status(401).json({ success: false, message: '认证失败', code: 'AUTH_FAILED' });
  }
}

/**
 * 权限中间件 - 仅管理员
 * 必须在 authenticate 之后使用
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return resp.forbidden(res, '无权限');
  }
  next();
}

/**
 * 权限中间件 - 管理员或资源所有者
 * @param {Function} getOwnerId - 异步函数，返回资源所有者ID
 * 必须在 authenticate 之后使用
 */
function requireAdminOrOwner(getOwnerId) {
  return async (req, res, next) => {
    if (req.user.role === 'admin') return next();
    try {
      const ownerId = typeof getOwnerId === 'function' ? await getOwnerId(req) : null;
      if (ownerId && req.user.id === ownerId) return next();
      return resp.forbidden(res, '无权限');
    } catch (err) {
      next(err);
    }
  };
}

module.exports = authenticate;
module.exports.requireAdmin = requireAdmin;
module.exports.requireAdminOrOwner = requireAdminOrOwner;
