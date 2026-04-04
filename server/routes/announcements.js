const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const config = require('../config');
const authenticate = require('../middleware/auth');
const sharp = require('sharp');

const JWT_SECRET = config.JWT_SECRET;
if (!JWT_SECRET && config.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET 环境变量未设置');
}

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: async (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '.webp');
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

const processImage = async (file) => {
  const webpFilename = file.filename;
  const originalPath = file.path;
  const webpPath = path.join(uploadDir, webpFilename);
  
  try {
    await sharp(originalPath)
      .webp({ quality: 80 })
      .toFile(webpPath);
    
    fs.unlinkSync(originalPath);
    
    return webpFilename;
  } catch (err) {
    console.error('图片转换失败:', err);
    return file.filename;
  }
};

const handleUpload = [
  authenticate,
  async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择图片文件' });
    }
    
    const webpFilename = await processImage(req.file);
    const fileUrl = `/uploads/${webpFilename}`;
    res.json({ success: true, url: fileUrl });
  }
];

router.post('/upload', upload.single('image'), ...handleUpload);

router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    const announcements = db.announcements.findAll({ status, type });
    res.json({ success: true, data: { list: announcements, total: announcements.length } });
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
