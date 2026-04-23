-- 2026-04-23: 学习进度追踪系统
-- Phase 2 核心功能：T2.1

-- 创建课程进度表
CREATE TABLE IF NOT EXISTS `course_progress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `course_id` INT NOT NULL COMMENT '课程ID',
  `chapter_id` INT NOT NULL DEFAULT 0 COMMENT '当前章节ID（0表示未开始）',
  `progress_percent` DECIMAL(5,2) DEFAULT 0.00 COMMENT '整体完成百分比(0-100)',
  `last_position` TEXT DEFAULT NULL COMMENT '最后阅读位置（JSON格式存储滚动位置等）',
  `time_spent` INT UNSIGNED DEFAULT 0 COMMENT '累计学习时长（秒）',
  `chapters_completed` JSON DEFAULT NULL COMMENT '已完成的章节ID数组 [1,2,3]',
  `last_chapter_title` VARCHAR(200) DEFAULT '' COMMENT '最后阅读的章节标题（用于断点续学提示）',
  `status` ENUM('in_progress','completed','abandoned') DEFAULT 'in_progress' COMMENT '学习状态',
  `started_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '首次访问时间',
  `last_accessed_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_course` (`user_id`, `course_id`),
  INDEX `idx_user_course` (`user_id`, `course_id`),
  INDEX `idx_course_user` (`course_id`, `user_id`),
  INDEX `idx_last_accessed` (`last_accessed_at`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程学习进度追踪表';

-- 添加外键约束（如果用户表和课程表存在）
-- ALTER TABLE `course_progress`
--   ADD CONSTRAINT `fk_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
--   ADD CONSTRAINT `fk_progress_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE;

-- 课程总览统计视图（可选，用于数据分析）
CREATE OR REPLACE VIEW `v_course_progress_stats` AS
SELECT
  c.id AS course_id,
  c.title AS course_title,
  COUNT(DISTINCT p.user_id) AS total_students,
  AVG(p.progress_percent) AS avg_progress,
  SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
  SUM(p.time_spent) AS total_time_spent_seconds
FROM courses c
LEFT JOIN course_progress p ON c.id = p.course_id
WHERE c.status = 'published'
GROUP BY c.id, c.title;

-- 索引优化说明：
-- 1. unique_user_course: 防止同一用户对同一课程重复创建记录
-- 2. idx_user_course: 快速查询"某用户的所有课程进度"
-- 3. idx_course_user: 快速查询"某课程的所有学员进度"
-- 4. idx_last_accessed: 用于排序"最近学习的课程"
-- 5. idx_status: 用于筛选"正在学习/已完成/已放弃"
