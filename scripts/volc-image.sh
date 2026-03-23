#!/bin/bash
# 火山引擎图像生成脚本
# 用法: ./volc-image.sh "prompt"

KEY=$(cat /volume2/共享盘/openclaw/xiaoyan/secrets/volcengine_key.txt)
PROMPT="${1:-A beautiful image}"

curl -s -X POST "https://ark.cn-beijing.volces.com/api/v3/images/generations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KEY" \
  -d "{
  \"model\": \"doubao-seedream-4-5-251128\",
  \"prompt\": \"$PROMPT\",
  \"response_format\": \"url\",
  \"stream\": false,
  \"watermark\": false
}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data'][0]['url'])"
