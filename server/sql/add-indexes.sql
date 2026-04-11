-- 索引优化脚本 - 为关键查询添加索引
-- 执行方式: mysql -u root -p trainer_ai_tool < add-indexes.sql
-- 安全：IF NOT EXISTS 确保可重复执行

-- 1. users 表 - 登录查询
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. questions 表 - 分类/类型/难度过滤
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

-- 3. papers 表 - 所有者/状态查询
CREATE INDEX IF NOT EXISTS idx_papers_owner_id ON papers(owner_id);
CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(status);

-- 4. exam_records 表 - 试卷/学生查询（最频繁）
CREATE INDEX IF NOT EXISTS idx_exam_records_paper_id ON exam_records(paper_id);
CREATE INDEX IF NOT EXISTS idx_exam_records_student_id ON exam_records(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_records_status ON exam_records(status);
CREATE INDEX IF NOT EXISTS idx_exam_records_graded ON exam_records(graded);

-- 5. essay_scores 表 - 评分查询
CREATE INDEX IF NOT EXISTS idx_essay_scores_exam_record_id ON essay_scores(exam_record_id);
CREATE INDEX IF NOT EXISTS idx_essay_scores_question_id ON essay_scores(question_id);
CREATE INDEX IF NOT EXISTS idx_essay_scores_graded_by ON essay_scores(graded_by);

-- 6. announcements 表 - 状态查询
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON announcements(author_id);

-- 7. promotions 表 - 创建者/状态查询
CREATE INDEX IF NOT EXISTS idx_promotions_created_by ON promotions(created_by);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);

-- 8. promotion_signups 表 - 推广/手机查询
CREATE INDEX IF NOT EXISTS idx_promotion_signups_promotion_id ON promotion_signups(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_signups_phone ON promotion_signups(phone);
CREATE INDEX IF NOT EXISTS idx_promotion_signups_status ON promotion_signups(status);

-- 9. categories 表 - 排序
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- 验证索引创建
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME NOT LIKE 'PRIMARY'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
