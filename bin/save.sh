#!/bin/bash
# save.sh —— 一次修改 = 一次提交（可选跑测试、可选打标签、自动推送）
# 用法：
#   ./bin/save.sh "改了什么"                 # 构建 + 提交 + 推送
#   ./bin/save.sh "改了什么" --test          # 构建 + 跑契约/移动端测试 + 提交 + 推送
#   ./bin/save.sh "改了什么" --test --tag v2.1.0
set -e
cd "$(dirname "$0")/.."

MSG="${1:-}"
shift || true
RUN_TEST=0
TAG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --test) RUN_TEST=1 ;;
    --tag) TAG="$2"; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
  shift
done

if [ -z "$MSG" ]; then
  echo "用法: ./bin/save.sh \"这次改了什么\" [--test] [--tag vX.Y.Z]"
  exit 1
fi

echo "▸ 1/5 构建 public/index.html"
node build.js

if [ "$RUN_TEST" = "1" ]; then
  echo "▸ 2/5 跑测试"
  python3 test_api2.py | tail -3
  python3 test_mobile2.py | tail -9
else
  echo "▸ 2/5 跳过测试（要跑加 --test）"
fi

echo "▸ 3/5 提交"
git add -A
if git diff --cached --quiet; then
  echo "  没有变化，跳过提交"
else
  git commit -q -m "$MSG"
  echo "  commit: $(git log --oneline -1)"
fi

if [ -n "$TAG" ]; then
  echo "▸ 4/5 打标签 $TAG"
  git tag -f "$TAG" >/dev/null
else
  echo "▸ 4/5 不打标签"
fi

echo "▸ 5/5 推送"
bash bin/push.sh

echo "✅ 完成。当前版本：$(git log --oneline -1)"
