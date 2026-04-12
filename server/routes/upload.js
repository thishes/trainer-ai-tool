// server/routes/upload.js - 通用文件上传路由
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const resp = require('../utils/response');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 JPG、PNG、GIF、WebP 格式的图片'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Multer 错误处理中间件
router.use((err, req, res, next) => {
  console.error('[Upload] Multer error:', err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: '图片大小不能超过 5MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: '一次只能上传一张图片' });
    }
    return res.status(400).json({ success: false, message: '上传错误: ' + err.message });
  }

  if (err.message && err.message.includes('只允许')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  next(err);
});

router.post('/', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return resp.error(res, '请选择图片文件');
    }

    const filename = req.file.filename;
    const fileUrl = `/uploads/${filename}`;

    console.log('[Upload] File uploaded:', filename, 'by user:', req.user?.username);

    resp.success(res, { url: fileUrl, filename });
  } catch (e) {
    console.error('[Upload] Error:', e);
    resp.error(res, e.message || '上传失败');
  }
});

module.exports = router;
