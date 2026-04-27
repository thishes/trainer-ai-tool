// server/routes/upload.js - 通用文件上传路由
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const resp = require('../utils/response');

const uploadDir = path.join(__dirname, '..', 'uploads');
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
  console.log('[Upload] File filter:', file.fieldname, file.mimetype, file.originalname);
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 JPG、PNG、GIF、WebP 格式的图片'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10
  }
});

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
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      // wangEditor 可能发送多个字段，只取第一个图片文件
      return res.status(400).json({ success: false, message: '上传格式错误: ' + err.message });
    }
    return res.status(400).json({ success: false, message: '上传错误: ' + err.message });
  }

  if (err.message && err.message.includes('只允许')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  next(err);
});

// 使用 .any() 接受任意字段名（兼容 wangEditor 的 UUID 字段名）
router.post('/', authenticate, requireAdmin, upload.any(), (req, res) => {
  console.log('[Upload] 📥 Request received:', {
    hasFiles: !!req.files,
    fileCount: req.files?.length || 0,
    contentType: req.get('content-type'),
    user: req.user?.username
  });

  try {
    if (!req.files || req.files.length === 0) {
      console.error('[Upload] ❌ No files in request');
      return res.status(400).json({ success: false, message: '请选择图片文件' });
    }

    const uploadedFile = req.files[0];
    const filename = uploadedFile.filename;
    const fileUrl = `/uploads/${filename}`;

    console.log('[Upload] ✅ File uploaded:', {
      filename,
      field: uploadedFile.fieldname,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      user: req.user?.username
    });

    res.json({
      success: true,
      url: fileUrl,
      filename,
      message: '上传成功'
    });
  } catch (e) {
    console.error('[Upload] ❌ Error:', e);
    res.status(500).json({
      success: false,
      message: e.message || '上传失败'
    });
  }
});

module.exports = router;
