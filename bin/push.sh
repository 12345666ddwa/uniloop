#!/bin/bash
# push.sh —— 用本地保存的 token 推送到 GitHub（不把 token 写进 .git/config）
set -e
cd "$(dirname "$0")/.."
TOKEN_FILE="$HOME/.hermes/secrets/github_token"
if [ ! -f "$TOKEN_FILE" ]; then
  echo "缺少 token 文件：$TOKEN_FILE"
  exit 1
fi
TOKEN=$(cat "$TOKEN_FILE")
REMOTE_URL="https://$TOKEN@github.com/12345666ddwa/uniloop.git"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push "$REMOTE_URL" "$BRANCH" --tags 2>&1 | sed -E 's#https://[^@]+@#https://[隐藏]@#'
echo "已推送 $BRANCH → https://github.com/12345666ddwa/uniloop"
