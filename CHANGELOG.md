# CHANGELOG — UniLoop

> 规则：**每次修改 = 一次提交 + 一条记录**。回滚方式见 `docs/GIT_WORKFLOW.md`。
> 版本号：功能/结构变化 → 次版本号 +1（v2.1.0）；修 bug / 文案 → 修订号 +1（v2.0.1）。

## v2.0.1 — 2026-10-18
**新增**
- 版本管理工具链：`bin/save.sh`（构建 + 可选测试 + 提交 + 打标签 + 推送）、`bin/push.sh`（token 不落盘到 `.git/config`）
- `CHANGELOG.md`、`docs/GIT_WORKFLOW.md`（含回滚命令）
- `.gitignore`（排除 `.sym-data/`、日志、临时文件）

## v2.0.0 — 2026-10-18
**首个可用基线（合并版）**
- 学生端：发现页（校区 / 时间 / 分类 / 免费 / 搜索筛选）、活动详情（OpenStreetMap + Google 导航）、收藏、我的票 / 社团 / 省下的钱
- 社团：目录（5 校校徽分组）、社团主页（评分 / 成员 / 粉丝 / 相册 / 评价 + 发评价）
- 主办方：Hub（KPI / 累计曲线 vs 容量 / 即将开始 / 过往相册 / 学生评价）、发布活动、参会名单 + CSV 导出
- 账号：注册 / 登录（scrypt + HttpOnly 会话）/ 角色（student、exec）/ 校区限制
- 支付：模拟会员与票务（测试卡 `4242 4242 4242 4242`；尾号 `0002` 失败态）
- 工程：零依赖 Node 后端；前端单文件（`src/` → `build.js` → `public/index.html`）；31 张独立活动图 + 5 个校徽本地化
- 测试：`test_api2.py` 22 项契约、`test_mobile2.py` 8 路由 390px 溢出检查
