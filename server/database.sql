-- 培训师AI测试工具 - 数据库初始化脚本

CREATE DATABASE IF NOT EXISTS trainer_ai_tool DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE trainer_ai_tool;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255),
  phone VARCHAR(20),
  role ENUM('trainer', 'student', 'admin') DEFAULT 'student',
  wechat_openid VARCHAR(100),
  avatar VARCHAR(255),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_wechat_openid (wechat_openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 题库分类表
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  parent_id BIGINT,
  description TEXT,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 题目表
CREATE TABLE IF NOT EXISTS questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title TEXT NOT NULL,
  type ENUM('single', 'multiple', 'judge', 'subjective') NOT NULL,
  options JSON,
  answer JSON NOT NULL,
  explanation TEXT,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  score INT DEFAULT 10,
  tags JSON,
  category_id BIGINT,
  user_id BIGINT NOT NULL,
  status ENUM('draft', 'published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 试卷表
CREATE TABLE IF NOT EXISTS papers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  total_score INT DEFAULT 100,
  time_limit INT DEFAULT 60,
  shuffle BOOLEAN DEFAULT FALSE,
  show_score BOOLEAN DEFAULT TRUE,
  show_answer BOOLEAN DEFAULT TRUE,
  access_code VARCHAR(20),
  qrcode_url VARCHAR(255),
  user_id BIGINT NOT NULL,
  status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 试卷题目关联表
CREATE TABLE IF NOT EXISTS paper_questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  paper_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  `order` INT DEFAULT 0,
  score INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_paper_id (paper_id),
  INDEX idx_question_id (question_id),
  UNIQUE KEY uk_paper_question (paper_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 考试记录表
CREATE TABLE IF NOT EXISTS exam_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  paper_id BIGINT NOT NULL,
  user_id BIGINT,
  student_name VARCHAR(50),
  ip_address VARCHAR(50),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  score INT,
  status ENUM('in_progress', 'submitted', 'graded') DEFAULT 'in_progress',
  answers JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_paper_id (paper_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 积分记录表
CREATE TABLE IF NOT EXISTS score_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  exam_record_id BIGINT,
  score INT NOT NULL,
  type ENUM('exam', 'first_submit', 'perfect_score', 'streak') DEFAULT 'exam',
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_exam_record_id (exam_record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
