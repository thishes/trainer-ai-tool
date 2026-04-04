// server/routes/api-docs.js - API 文档路由
const express = require('express');
const router = express.Router();
const swaggerSpec = require('../config/swagger');

/**
 * @swagger
 * /api/docs:
 *   get:
 *     tags: [系统]
 *     summary: 获取 API 文档
 *     description: 获取 Swagger OpenAPI 规范 JSON
 *     responses:
 *       200:
 *         description: 成功的响应
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: 服务器错误
 */
router.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /api/docs/ui:
 *   get:
 *     tags: [系统]
 *     summary: API 文档界面
 *     description: 访问 Swagger UI 界面
 *     responses:
 *       200:
 *         description: HTML 页面
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/api-docs/ui', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>培训师 AI 工具 - API 文档</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
        <style>
          html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
          }
          *, *:before, *:after {
            box-sizing: inherit;
          }
          body {
            margin: 0;
            background: #fafafa;
          }
          .topbar {
            display: none;
          }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
        <script>
          window.onload = function() {
            const ui = SwaggerUIBundle({
              url: '/api/api-docs.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "StandaloneLayout",
              validatorUrl: null,
              displayRequestDuration: true,
              filter: true,
              showExtensions: true,
              showCommonExtensions: true,
              docExpansion: 'list',
              defaultModelsExpandDepth: 2,
              defaultModelExpandDepth: 2,
              tagsSorter: 'alpha',
              operationsSorter: 'alpha'
            });
            window.ui = ui;
          };
        </script>
      </body>
    </html>
  `);
});

module.exports = router;
