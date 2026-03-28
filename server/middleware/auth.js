// server/middleware/auth.js - 认证中间件
const jwt = require('jsonwebtoken');
const config = require('../config');

const JWT_SECRET = config.JWT_SECRET;
if (!JWT_SECRET && config.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 环境变量未设置');
}

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '未登录', code: 'NO_TOKEN' });
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'token格式错误', code: 'INVALID_TOKEN_FORMAT' });
  }
  
  const token = parts[1];
  
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
};
