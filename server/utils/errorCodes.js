// server/utils/errorCodes.js - 统一错误码定义
const ERROR_CODES = {
  // 通用错误 (1000-1999)
  SUCCESS: { code: 0, message: '操作成功' },
  UNKNOWN_ERROR: { code: 1000, message: '服务器内部错误，请稍后重试' },
  INVALID_PARAMS: { code: 1001, message: '请求参数错误，请检查输入' },
  NOT_FOUND: { code: 1002, message: '请求的资源不存在' },
  FORBIDDEN: { code: 1003, message: '没有权限执行此操作' },
  UNAUTHORIZED: { code: 1004, message: '登录已过期，请重新登录' },
  RATE_LIMITED: { code: 1005, message: '请求过于频繁，请稍后再试' },
  NETWORK_ERROR: { code: 1006, message: '网络连接失败，请检查网络' },

  // 用户相关 (2000-2999)
  USER_NOT_FOUND: { code: 2001, message: '用户不存在' },
  USER_EXISTS: { code: 2002, message: '用户名已存在，请更换' },
  PASSWORD_WEAK: { code: 2003, message: '密码强度不足，至少6位' },
  PASSWORD_WRONG: { code: 2004, message: '用户名或密码错误' },
  USER_LOCKED: { code: 2005, message: '账号已被锁定，请联系管理员' },
  TOKEN_INVALID: { code: 2006, message: '登录凭证无效，请重新登录' },
  TOKEN_EXPIRED: { code: 2007, message: '登录已过期太久，请重新登录' },
  REFRESH_TOO_OFTEN: { code: 2008, message: '刷新次数过多，请重新登录' },

  // 考试相关 (3000-3999)
  EXAM_NOT_FOUND: { code: 3001, message: '考试记录不存在' },
  EXAM_SUBMITTED: { code: 3002, message: '试卷已提交，请勿重复操作' },
  EXAM_NO_PERMISSION: { code: 3003, message: '无权限访问此考试，请确认身份信息' },
  PAPER_NOT_PUBLISHED: { code: 3004, message: '试卷不存在或未发布' },
  ACCESS_CODE_WRONG: { code: 3005, message: '访问密码错误' },
  IP_LIMIT_EXCEEDED: { code: 3006, message: '此IP已完成考试，无法再次参加' },
  STUDENT_MISMATCH: { code: 3007, message: '考生信息不匹配，无法参加考试' },
  EXAM_TIME_EXPIRED: { code: 3008, message: '考试时间已结束' },

  // 题目/试卷 (4000-4099)
  QUESTION_NOT_FOUND: { code: 4001, message: '题目不存在' },
  PAPER_NOT_FOUND: { code: 4002, message: '试卷不存在' },
  PAPER_NO_QUESTIONS: { code: 4003, message: '试卷暂无题目' },
  IMPORT_FAILED: { code: 4004, message: '导入失败，请检查数据格式' },
  IMPORT_PARTIAL: { code: 4005, message: '部分数据导入成功' },

  // 课程相关 (4100-4199) 【T1.6新增】
  COURSE_NOT_FOUND: { code: 4101, message: '课程不存在' },
  COURSE_SLUG_DUPLICATE: { code: 4102, message: '课程标识符已被使用，请更换其他标识符' },
  COURSE_NO_CHAPTERS_TO_PUBLISH: { code: 4103, message: '发布前至少需要一个已发布的章节' },
  COURSE_CHAPTER_DELETE_LAST: { code: 4104, message: '至少需要保留一个章节，无法删除' },
  COURSE_ACCESS_LIMIT_EXCEEDED: { code: 4105, message: '授权学员数量已达上限' },
  COURSE_LOCKED: { code: 4106, message: '该课程正在被其他管理员编辑中，请稍后再试' },
  COURSE_PASSWORD_WRONG: { code: 4107, message: '访问密码错误，请重新输入' },
  COURSE_NOT_PUBLISHED: { code: 4108, message: '该课程暂未发布，无法访问' },
  COURSE_PRIVATE_NO_ACCESS: { code: 4109, message: '您没有权限访问此私有课程' },
  CHAPTER_NOT_FOUND: { code: 4110, message: '章节不存在或已被删除' },
  CHAPTER_CONTENT_TOO_LONG: { code: 4111, message: '章节内容超出长度限制（最大50万字）' },
  COURSE_TITLE_REQUIRED: { code: 4112, message: '课程标题不能为空' },
  COURSE_TITLE_TOO_LONG: { code: 4113, message: '课程标题过长，最多200个字符' },

  // 数据库 (5000-5999)
  DB_CONNECTION_FAILED: { code: 5001, message: '数据库连接失败' },
  DB_QUERY_TIMEOUT: { code: 5002, message: '查询超时，请重试' },
  DUPLICATE_ENTRY: { code: 5003, message: '数据已存在' }
};

/**
 * 根据错误类型获取友好的错误信息
 * @param {string} errorType - 错误类型键
 * @param {Object} extra - 额外信息
 * @returns {Object} 标准化错误响应
 */
function getErrorResponse(errorType, extra = {}) {
  const errorDef = ERROR_CODES[errorType] || ERROR_CODES.UNKNOWN_ERROR;
  return {
    success: false,
    error: {
      code: errorDef.code,
      message: errorDef.message,
      ...extra
    }
  };
}

/**
 * 从异常对象提取友好错误信息
 * @param {Error} err - 异常对象
 * @returns {string}
 */
function getFriendlyMessage(err) {
  const msg = err.message || '';

  // MySQL 错误码映射
  if (msg.includes('ER_DUP_ENTRY')) {
    return ERROR_CODES.DUPLICATE_ENTRY.message;
  }
  if (msg.includes('ER_NO_REFERENCED_ROW')) {
    return '关联数据不存在';
  }

  // 常见关键字匹配
  const keywords = {
    'duplicate': ERROR_CODES.DUPLICATE_ENTRY.message,
    'not found': ERROR_CODES.NOT_FOUND.message,
    'unauthorized': ERROR_CODES.UNAUTHORIZED.message,
    'forbidden': ERROR_CODES.FORBIDDEN.message,
    'timeout': ERROR_CODES.DB_QUERY_TIMEOUT.message,
    'connection': ERROR_CODES.DB_CONNECTION_FAILED.message,
    'validation': ERROR_CODES.INVALID_PARAMS.message,

    // 【T1.6】课程相关关键字
    'slug': msg.includes('duplicate') ? ERROR_CODES.COURSE_SLUG_DUPLICATE.message : '标识符错误',
    'chapter.*delete|至少需要保留': ERROR_CODES.COURSE_CHAPTER_DELETE_LAST.message,
    'publish.*chapter|发布前': ERROR_CODES.COURSE_NO_CHAPTERS_TO_PUBLISH.message,
    'password.*course|密码错误': ERROR_CODES.COURSE_PASSWORD_WRONG.message,
    'private.*access|私有.*权限': ERROR_CODES.COURSE_PRIVATE_NO_ACCESS.message
  };

  for (const [key, friendlyMsg] of Object.entries(keywords)) {
    if (msg.toLowerCase().includes(key)) {
      return friendlyMsg;
    }
  }

  // 默认返回技术错误（仅开发环境）
  if (process.env.NODE_ENV === 'development') {
    return msg;
  }
  return ERROR_CODES.UNKNOWN_ERROR.message;
}

module.exports = {
  ERROR_CODES,
  getErrorResponse,
  getFriendlyMessage
};
