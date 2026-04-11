// server/middleware/validate.js - 统一输入验证中间件
// 基于 Joi 的请求验证，确保所有输入在到达路由前已验证

const { ValidationError } = require('./errorHandler');

/**
 * 创建验证中间件
 * @param {Object} schema - Joi schema 对象，支持 body/query/params
 * @returns {Function} Express 中间件
 *
 * 使用示例:
 *   const Joi = require('joi');
 *   const validate = require('../middleware/validate');
 *
 *   const loginSchema = {
 *     body: Joi.object({
 *       username: Joi.string().required().min(2).max(50),
 *       password: Joi.string().required().min(6)
 *     })
 *   };
 *
 *   router.post('/login', validate(loginSchema), handler);
 */
function validate(schema) {
  return (req, res, next) => {
    const validationErrors = [];

    // 验证 body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
      if (error) {
        error.details.forEach(d => {
          validationErrors.push({
            field: d.path.join('.'),
            message: d.message
          });
        });
      } else {
        req.body = value; // 使用验证后的值（已 stripUnknown）
      }
    }

    // 验证 query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
      if (error) {
        error.details.forEach(d => {
          validationErrors.push({
            field: d.path.join('.'),
            message: d.message
          });
        });
      } else {
        req.query = value;
      }
    }

    // 验证 params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
      if (error) {
        error.details.forEach(d => {
          validationErrors.push({
            field: d.path.join('.'),
            message: d.message
          });
        });
      } else {
        req.params = value;
      }
    }

    if (validationErrors.length > 0) {
      const summary = validationErrors.map(e => e.message).join('; ');
      throw new ValidationError(`参数验证失败: ${summary}`, validationErrors);
    }

    next();
  };
}

/**
 * 常用验证规则
 */
const commonRules = {
  id: () => require('joi').number().integer().positive().required(),
  optionalId: () => require('joi').number().integer().positive(),
  username: () => require('joi').string().min(2).max(50).required(),
  password: () => require('joi').string().min(6).max(128).required(),
  phone: () => require('joi').string().pattern(/^1[3-9]\d{9}$/).allow('', null),
  pagination: () => ({
    page: require('joi').number().integer().min(1).default(1),
    pageSize: require('joi').number().integer().min(1).max(100).default(20)
  })
};

module.exports = { validate, commonRules };
