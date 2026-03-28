const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const JWT_SECRET = config.JWT_SECRET;
if (!JWT_SECRET && config.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 环境变量未设置');
}

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'token格式错误' });
  }
  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'token无效' });
  }
};

const handleUpload = [
  authenticate,
  (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择图片文件' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  }
];

router.post('/upload', upload.single('image'), ...handleUpload);

router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    const announcements = db.announcements.findAll({ status, type });
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('获取公告错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const announcement = db.announcements.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }
    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('获取公告错误:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const { title, content, type, status } = req.body;
    console.log('Creating announcement:', { title, content, type, status });

    if (!title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    const announcement = db.announcements.create({
      title,
      content: content || '',
      type: type || 'notice',
      status: status || 'published',
      author_id: req.user.id,
      author_name: req.user.username
    });

    res.json({ success: true, message: '创建成功', data: announcement });
  } catch (error) {
    console.error('创建公告错误:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const announcement = db.announcements.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }

    const { title, content, type, status } = req.body;

    if (title !== undefined && !title) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    if (content !== undefined) {
      const strippedContent = content.replace(/<[^>]*>/g, '').trim();
      if (!strippedContent) {
        return res.status(400).json({ success: false, message: '内容不能为空' });
      }
    }

    const updated = db.announcements.update(req.params.id, {
      title: title !== undefined ? title : announcement.title,
      content: content !== undefined ? content : announcement.content,
      type: type !== undefined ? type : announcement.type,
      status: status !== undefined ? status : announcement.status
    });

    res.json({ success: true, message: '更新成功', data: updated });
  } catch (error) {
    console.error('更新公告错误:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }

    const announcement = db.announcements.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }

    db.announcements.delete(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除公告错误:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

module.exports = router;
