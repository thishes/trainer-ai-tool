#!/bin/bash
# MySQL 自动备份脚本
# 用法: ./scripts/backup-mysql.sh
# 建议加入 crontab: 0 2 * * * /path/to/scripts/backup-mysql.sh
#
# 环境变量（从 .env 文件或环境读取）:
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
#   BACKUP_DIR - 备份存储目录（默认: ./backups）
#   BACKUP_RETAIN_DAYS - 保留天数（默认: 30）

set -euo pipefail

# 加载 .env 文件
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/server/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# 配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-trainer_ai_tool}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 日期标记
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

echo "[$(date)] Starting backup: $DB_NAME"

# 执行备份
if [ -n "$DB_PASSWORD" ]; then
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
    --single-transaction --routines --triggers --add-drop-table \
    "$DB_NAME" | gzip > "$BACKUP_FILE"
else
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    --single-transaction --routines --triggers --add-drop-table \
    "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# 检查备份是否成功
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup completed: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ERROR: Backup failed!" >&2
  exit 1
fi

# 清理过期备份
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETAIN_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned up $DELETED old backup(s) (older than $RETAIN_DAYS days)"
fi

# 同时备份 JSON 数据文件
JSON_DIR="$PROJECT_DIR/server/data"
if [ -d "$JSON_DIR" ]; then
  JSON_BACKUP="$BACKUP_DIR/json_${DATE}.tar.gz"
  tar -czf "$JSON_BACKUP" -C "$PROJECT_DIR/server" data/
  if [ -f "$JSON_BACKUP" ]; then
    JSON_SIZE=$(du -h "$JSON_BACKUP" | cut -f1)
    echo "[$(date)] JSON backup: $JSON_BACKUP ($JSON_SIZE)"
  fi
fi

echo "[$(date)] All backups completed"
