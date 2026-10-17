# Git 工作流与回滚手册

## 仓库在哪

| 位置 | 地址 |
|---|---|
| 本地 | `~/workspace/uniloop_merged`（独立仓库，不混在 workspace 大仓里） |
| 远端（私有） | https://github.com/12345666ddwa/uniloop |
| 分支 | `main` |
| 标签 | 每个里程碑一个（`v2.0.0`、`v2.0.1` …） |

## 每次修改怎么做（一条命令）

```bash
cd ~/workspace/uniloop_merged
./bin/save.sh "这次改了什么"            # 构建 + 提交 + 推送
./bin/save.sh "加了活动编辑页" --test    # 额外跑 22 项契约 + 8 路由移动端检查
./bin/save.sh "v2.1.0 功能包" --test --tag v2.1.0   # 打标签
```

它做的事：`node build.js` →（可选）测试 → `git add -A` → `git commit` →（可选）`git tag` → `git push`

> **改完就存**，不要攒着改。每次提交都有独立 hash，随时能回到上一版。

## 回滚的四种场景

### 1) 只想看看上一版（不改历史）
```bash
git log --oneline --decorate        # 找目标提交
git checkout v2.0.0                 # 切到某个标签（只读查看）
git checkout main                   # 看完切回来
```

### 2) 把某个文件恢复到上一版（最常用）
```bash
git checkout HEAD~1 -- public/index.html   # 恢复上一个提交的该文件
# 或者从某个标签恢复
git checkout v2.0.0 -- src/app.js
node build.js && ./bin/save.sh "回滚 src/app.js 到 v2.0.0"
```

### 3) 撤销某次提交（保留完整历史，推荐）
```bash
git revert <commit-hash>            # 生成一个"反向提交"
./bin/save.sh "回滚到上一版"
```

### 4) 丢弃还没提交的改动（危险）
```bash
git status                          # 先看清楚
git checkout -- .                   # 丢弃所有未提交修改
git clean -fd                       # 连新增文件一起清（慎用）
```

## 看历史

```bash
git log --oneline --decorate --graph     # 图形化历史 + 标签
git tag -n                               # 所有标签及说明
git show v2.0.0 --stat                   # 某个版本改了什么
git diff v2.0.0..HEAD                    # 两版之间全部差异
```

## 日常注意

- `.sym-data/`（运行数据）和 `TUNNEL_URL.txt` 不进版本库；演示前重置数据只需删 `.sym-data/uniloop-db.json`。
- 图片素材（`public/assets/`）**要**提交，评委/部署都依赖它。
- token 存在 `~/.hermes/secrets/github_token`（权限 600），**不要**写进 `.git/config` 或代码；`bin/push.sh` 会自动用它。
- 如果只想本地存档不推送：`git add -A && git commit -m "..."`（不走 save.sh 的推送步骤）。
