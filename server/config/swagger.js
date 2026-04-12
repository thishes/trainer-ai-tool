/**
 * Swagger API 文档配置
 * 使用 swagger-jsdoc 自动生成 OpenAPI 规范
 */

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const isProduction = process.env.NODE_ENV === 'production';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '培训师 AI 工具 - API 文档',
      version: '1.0.0',
      description: '专为培训场景设计的 AI 测试工具 API 接口文档',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: process.env.SWAGGER_URL || (isProduction ? 'https://api.example.com' : 'http://localhost:3001'),
        description: isProduction ? '生产环境' : '开发环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token 认证，格式：Bearer {token}'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session Cookie 认证'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            id: {
              type: 'integer',
              description: '用户 ID'
            },
            username: {
              type: 'string',
              description: '用户名',
              minLength: 3,
              maxLength: 50
            },
            phone: {
              type: 'string',
              description: '手机号'
            },
            role: {
              type: 'string',
              enum: ['trainer', 'student', 'admin'],
              description: '用户角色'
            },
            avatar: {
              type: 'string',
              description: '头像 URL'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: '用户状态'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        Question: {
          type: 'object',
          required: ['title', 'type', 'answer'],
          properties: {
            id: {
              type: 'integer',
              description: '题目 ID'
            },
            title: {
              type: 'string',
              description: '题目标题'
            },
            type: {
              type: 'string',
              enum: ['single', 'multiple', 'judge', 'subjective'],
              description: '题目类型（单选/多选/判断/主观）'
            },
            options: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '选项数组'
            },
            answer: {
              type: 'object',
              description: '正确答案'
            },
            explanation: {
              type: 'string',
              description: '答案解析'
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
              description: '难度等级'
            },
            score: {
              type: 'integer',
              description: '默认分数'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '标签数组'
            },
            categoryId: {
              type: 'integer',
              description: '分类 ID'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published'],
              description: '发布状态'
            }
          }
        },
        Paper: {
          type: 'object',
          required: ['title'],
          properties: {
            id: {
              type: 'integer',
              description: '试卷 ID'
            },
            title: {
              type: 'string',
              description: '试卷标题'
            },
            description: {
              type: 'string',
              description: '试卷描述'
            },
            totalScore: {
              type: 'integer',
              description: '总分'
            },
            timeLimit: {
              type: 'integer',
              description: '考试时间（分钟）'
            },
            shuffle: {
              type: 'boolean',
              description: '是否随机题目顺序'
            },
            showScore: {
              type: 'boolean',
              description: '交卷后是否显示分数'
            },
            showAnswer: {
              type: 'boolean',
              description: '交卷后是否显示答案'
            },
            accessCode: {
              type: 'string',
              description: '访问密码'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'closed'],
              description: '试卷状态'
            }
          }
        },
        ExamRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '考试记录 ID'
            },
            paperId: {
              type: 'integer',
              description: '试卷 ID'
            },
            userId: {
              type: 'integer',
              description: '用户 ID'
            },
            studentName: {
              type: 'string',
              description: '学员姓名'
            },
            score: {
              type: 'integer',
              description: '得分'
            },
            status: {
              type: 'string',
              enum: ['in_progress', 'submitted', 'graded'],
              description: '考试状态'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: '开始时间'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: '结束时间'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: '错误消息'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '详细错误信息'
            }
          }
        }
      }
    },
    tags: [
      {
        name: '认证',
        description: '用户认证相关接口'
      },
      {
        name: '用户',
        description: '用户管理相关接口'
      },
      {
        name: '题目',
        description: '题库管理相关接口'
      },
      {
        name: '试卷',
        description: '试卷管理相关接口'
      },
      {
        name: '考试',
        description: '考试相关接口'
      },
      {
        name: '分类',
        description: '分类管理相关接口'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/*.js')
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
