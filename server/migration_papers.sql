ALTER TABLE papers ADD COLUMN owner_id BIGINT NOT NULL DEFAULT 1 AFTER description;
ALTER TABLE papers ADD COLUMN duration INT DEFAULT 60 AFTER owner_id;
ALTER TABLE papers ADD COLUMN passing_score INT DEFAULT 60 AFTER total_score;
ALTER TABLE papers ADD COLUMN question_ids JSON AFTER passing_score;
ALTER TABLE papers ADD COLUMN random_config JSON AFTER question_ids;
CREATE INDEX idx_owner ON papers(owner_id);
