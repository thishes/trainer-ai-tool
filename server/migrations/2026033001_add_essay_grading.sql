-- 问答题打分功能 - 数据库更新脚本

USE trainer_ai_tool;

-- 1. 在 exam_records 表添加问答题答案字段
ALTER TABLE exam_records
ADD COLUMN IF NOT EXISTS essay_answers JSON COMMENT '问答题答案JSON' AFTER answers;

-- 2. 创建问答题评分表
CREATE TABLE IF NOT EXISTS essay_scores (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  exam_record_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  score INT DEFAULT 0 COMMENT '得分',
  max_score INT DEFAULT 0 COMMENT '满分',
  remark TEXT COMMENT '评语',
  graded_by BIGINT COMMENT '评分人ID',
  graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exam_record_id (exam_record_id),
  INDEX idx_question_id (question_id),
  UNIQUE KEY uk_record_question (exam_record_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
