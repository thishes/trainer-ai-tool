// server/routes/students.js - 考生管理路由 (统一数据访问层)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const repo = require('../repository');
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const resp = require('../utils/response');

const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 Excel 文件 (.xlsx, .xls)'), false);
    }
  }
});

router.get('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const students = await repo.getStudents();
  resp.success(res, { list: students, total: students.length });
}));

router.get('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const student = await repo.getStudentById(req.params.id);
  if (!student) {
    return resp.notFound(res, '考生不存在');
  }
  resp.success(res, student);
}));

router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !name.trim()) {
    return resp.error(res, '考生姓名不能为空');
  }

  const student = await repo.createStudent({
    name: name.trim(),
    phone: phone ? phone.trim() : null
  });

  resp.success(res, student, '添加成功');
}));

router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const student = await repo.getStudentById(req.params.id);
  if (!student) {
    return resp.notFound(res, '考生不存在');
  }

  const { name, phone } = req.body;

  if (name !== undefined && !name.trim()) {
    return resp.error(res, '考生姓名不能为空');
  }

  const updated = await repo.updateStudent(req.params.id, {
    name: name !== undefined ? name.trim() : student.name,
    phone: phone !== undefined ? (phone ? phone.trim() : null) : student.phone
  });

  resp.success(res, updated, '更新成功');
}));

router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const student = await repo.getStudentById(req.params.id);
  if (!student) {
    return resp.notFound(res, '考生不存在');
  }

  await repo.deleteStudent(req.params.id);
  resp.success(res, null, '删除成功');
}));

router.post('/import', authenticate, requireAdmin, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return resp.error(res, '请上传文件');
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!['.xlsx', '.xls'].includes(ext)) {
    return resp.error(res, '只支持Excel文件(.xlsx, .xls)');
  }

  const workbook = XLSX.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    return resp.error(res, 'Excel文件为空');
  }

  const students = [];
  const errors = [];

  data.forEach((row, index) => {
    const name = row['考生姓名'] || row['姓名'] || row['name'];
    const phone = row['考生手机'] || row['手机'] || row['phone'] || null;

    if (!name || !String(name).trim()) {
      errors.push(`第${index + 2}行: 考生姓名不能为空`);
      return;
    }

    students.push({
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : null
    });
  });

  if (students.length === 0) {
    return resp.error(res, '没有有效的考生数据');
  }

  const created = await repo.bulkCreateStudents(students);

  resp.success(res, { imported: created.length, errors: errors.length > 0 ? errors : undefined }, `成功导入${created.length}名考生`);
}));

router.get('/paper/:paperId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const paperStudents = await repo.getPaperStudentsByPaperId(req.params.paperId);
  resp.success(res, { list: paperStudents, total: paperStudents.length });
}));

router.get('/paper/:paperId/export', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.paperId);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  const paperStudents = await repo.getPaperStudentsByPaperId(req.params.paperId);
  const data = paperStudents.map(ps => ({
    '考生号': ps.student ? ps.student.student_no : '',
    '考生姓名': ps.student ? ps.student.name : '',
    '考生手机': ps.student ? (ps.student.phone || '') : ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '考生名单');
  const fileName = `${paper.title}_考生名单.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.send(buffer);
}));

router.post('/paper/:paperId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const paper = await repo.getPaperById(req.params.paperId);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  const { student_ids } = req.body;

  if (!Array.isArray(student_ids)) {
    return resp.error(res, '参数错误');
  }

  const created = await repo.addPaperStudents(paper.id, paper.key_id, student_ids);

  resp.success(res, created, `成功添加${created.length}名考生`);
}));

router.delete('/paper/:paperId/:studentId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await repo.removePaperStudent(req.params.paperId, req.params.studentId);
  resp.success(res, null, '移除成功');
}));

router.delete('/paper/:paperId/all', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await repo.clearPaperStudents(req.params.paperId);
  resp.success(res, null, '清空成功');
}));

router.post('/verify', asyncHandler(async (req, res) => {
  const { paper_id, student_no, name } = req.body;

  if (!paper_id || !name) {
    return resp.error(res, '参数错误');
  }

  const paper = await repo.getPaperById(paper_id);
  if (!paper) {
    return resp.notFound(res, '试卷不存在');
  }

  if (!paper.allow_all_users) {
    const paperStudents = await repo.getPaperStudentsByPaperId(paper_id);
    const student = paperStudents.find(ps => ps.student && ps.student.name === name);

    if (!student) {
      return resp.forbidden(res, '您不在允许参加考试的名单中');
    }

    return resp.success(res, { student_id: student.student_id }, '验证成功');
  }

  resp.success(res, null, '验证成功');
}));

module.exports = router;
