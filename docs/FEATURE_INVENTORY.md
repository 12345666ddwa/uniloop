# UniLoop 功能盘点 × 模板映射（队友能力 → 设计模板全量落地）

> 目标：把队友那版（`uniloop2/uniloop`）的**全部功能与可点击交互**，完整放进设计稿模板 `version-a`（编辑风格）里。
> 结果：后端沿用队友的业务能力并升级为**契约化 API**；前端 100% 复用模板 CSS/组件类名，新增页面按同一套 token 扩展。
> 当前状态：**已实现并通过 22 项契约测试**（`test_api.py`）。

---

## 一、账号与身份（模板原本没有，已补齐）

| 能力 | 交互点 | 实现 | 状态 |
|---|---|---|---|
| 注册 | 右上「Log in」→ 弹层切到 Sign up（姓名/邮箱/校区/密码） | `POST /api/auth/signup`（scrypt 哈希） | ✅ |
| 登录 | 弹层 Log in；演示账号一键填充（Student / Organiser） | `POST /api/auth/login` + HttpOnly cookie 7 天 | ✅ |
| 登出 | 右上 ⏏ | `POST /api/auth/logout` | ✅ |
| 角色 | 顶栏 Student / Organiser 切换；organiser 需 exec 账号，否则引导登录 | 前端守卫 + `needExec` 后端 403 | ✅ |
| 校区 | 注册时选择；影响 CAMPUS_ONLY 活动可见/可报 | `users.campusId` + `scopeAllows()` | ✅ |
| 我的资料 | 「My events」页展示姓名/校区/会员/省下的钱 | `GET /api/me` | ✅ |

**演示账号**：学生 `student@uniloop.demo` · 主办方 `exec@uniloop.demo` · 密码 `demo1234`

---

## 二、学生端（模板 Discover 页 → 全部真实数据）

| 模块/交互 | 说明 | 状态 |
|---|---|---|
| Hero 标题区 | “Find your kind of day.” + 日期/城市 eyebrow + 登录后问候语（Jamie） | ✅ |
| 搜索框 | 输入即查（300ms 防抖），命中标题/社团/场地 | ✅ |
| 分类筛选 | For you / Outdoors / Social / Creative / Sport / Careers 六个 chip | ✅ |
| 校区/时间 pill | 显示当前校区；「This week」（模板控件保留） | ✅ |
| 主推卡（feature） | 大图 + 日期角标 + Scope 标签 + 标题/主办/时间/描述 + 报名数/余位 + RSVP | ✅ |
| 活动网格 | 卡片：图片、日期角标、Scope、标题（可点进详情）、时间、地点·社团、余位、RSVP 三态 | ✅ |
| Scope 标签 | `OPEN TO ALL` / `OWN CAMPUS ONLY`（文字区分，不只靠颜色） | ✅ |
| RSVP 三态 | `RSVP free` / `RSVP · $X` → `You're in` → `Full`（置灰不可点） | ✅ |
| Loop AI 面板 | 输入“free Saturday morning…”→ **规则**解析时间窗+兴趣 → 返回命中活动 + 理由清单 + 跳详情；显示“considered / excluded by rules” | ✅ |
| Campus pulse | Macquarie 本周活动数、跨校开放数、最活跃社团（实时计算） | ✅ |
| 活动详情页 | 大图、Scope、标题、社团·时间、场地、描述、报名进度条、价格盒（public/member/你付）、加入社团入口、RSVP/取消 | ✅ |
| 加入社团 | 详情页或社团页按钮 →（付费则弹测试支付）→ 会员价自动生效 | ✅ |
| 我的票 | 「My events」→ 我的票（可取消）、我的社团（付费/加入时间）、累计省下金额 | ✅ |
| 社团目录 | 「Societies」→ 12 个社团卡（校区/成员数/即将开始活动/加入价格/是否会员） | ✅ |
| 社团主页 | 简介、成员数、标签、Join 按钮、该社团即将开始的活动列表 | ✅ |

---

## 三、主办方端（模板 Organiser 概览 → 真实聚合）

| 模块/交互 | 说明 | 状态 |
|---|---|---|
| 活动条 | 当前活动封面 + 标题 + Published / Open-to-all 标签 + 时间地点 + View event | ✅ |
| KPI 行 | **Confirmed RSVPs**（含 24h 增量）、**Capacity %**（含剩余名额）、**Page views**（含转化率）、**Members**（会员占比 + 总收入） | ✅ |
| RSVPs 趋势图 | 最近 7 天真实报名数生成 SVG 折线+面积（空日不画 0 断崖） | ✅ |
| Loop AI 到场预估 | 由报名数推区间（≈80%–92%）+ 依据文案 + 「Estimate, not a measurement.」+ Send a reminder | ✅ |
| 参会名单 | 学生/邮箱/报名时间/票种（Member/General），显示前 8 行 | ✅ |
| 查看全部 | 「View all attendees →」独立页：完整名单 + Export CSV | ✅ |
| 发布活动 | 「Create event」弹层：名称/描述/分类/谁能参加/日期/时间/地点/容量/会员价/公开价 → 发布后学生端立即出现 | ✅ |
| 活动列表 | 该社团全部活动 + 报名数/容量 + Scope | ✅ |
| 实时 | 看板每 5 秒轮询刷新（切后台暂停），学生报名后数字与名单自动更新 | ✅ |
| 权限 | 非 exec 进「Organiser」被拦；学生调 API 返回 403 | ✅ |

---

## 四、支付与会员（模板没有，队友有 → 保留并接入模板）

| 能力 | 实现 |
|---|---|
| 模拟支付 | 测试卡 `4242 4242 4242 4242`；尾号 `0002` 会被拒（用于演示失败态） |
| 会员折扣 | 加入社团后 `price_member` 自动生效，详情页显示“你付”与省下金额 |
| 收入统计 | 会员费 + 票款计入看板 `revenue` |
| 诚实披露 | 全部为测试模式，不接真实支付渠道 |

---

## 五、数据契约（对齐 `docs/event-schema.json`）

- **Event**：`id/title/description/category/campus_id/campus_name/venue/starts_at/ends_at/audience_scope/society_id/society_name/cover_image_url/capacity/status/rsvp_count/page_views`（+ 扩展 `price_member/price_public/your_price/is_member/seats_left/my_rsvp/can_rsvp`）
- **RSVP**：`(event_id,user_id)` 只能有一条 CONFIRMED（连点不会 +2）
- **容量**：满员返回 409，按钮变 `Full`
- **校区**：`CAMPUS_ONLY` 非本校返回 403
- **推荐**：`POST /api/recommend` → `results[].{event_id,match_reason,match_tags,has_time_conflict,travel_minutes}` + `considered/excluded`
- **看板**：`stats{rsvp_count,capacity_filled_rate,page_views,view_to_rsvp_rate,...}` + `daily_rsvps[7]` + `prediction{predicted_attendees_low/high,basis,label}` + `attendees[]`

---

## 六、可点击元素总清单（演示时能点到的）

**顶栏**：品牌 → Discover · Discover / My events / Societies 导航 · Student/Organiser 切换 · 头像 · 登出 / Log in  
**Discover**：搜索框 · 6 个分类 chip · 校区 pill · 时间 pill · 主推卡 RSVP · 网格每张卡（标题→详情、RSVP）· Loop AI 输入+提交+“See the details”→ · Campus pulse  
**详情页**：← Back · Join society · RSVP / You're in / Full · Cancel RSVP  
**My events**：票卡（详情/取消）· 社团卡（查看社团）  
**Societies**：12 个社团卡（整卡可点）· Join  
**社团页**：Join · 活动卡（详情/RSVP）  
**Organiser**：Create event（弹层：9 个字段 + Publish）· View event · Send a reminder · Export CSV · View all attendees → · 活动表每行 → 详情  
**弹层类**：登录/注册切换 + 2 个演示账号按钮 · 支付确认（卡号/取消/付款） · 创建活动（取消/发布） · Toast

---

## 七、状态覆盖（交接文档要求的都在）

| 状态 | 实现 |
|---|---|
| 加载 | 骨架屏（首页主卡+网格、详情页整块） |
| 空结果 | “Nothing matches that filter yet.” + Clear filters |
| 空名单 | “No RSVPs yet. Share the event link.” |
| 错误 | 支付/报名失败 → 按钮复原 + toast/内联提示，不静默失败 |
| 满员 | 按钮 `Full` 且 disabled |
| 未登录 | 点 RSVP 弹出登录；进 Organiser 需 exec 账号 |
| 校区限制 | 外校看到 `Campus only`（禁用）或详情页提示 |

---

## 八、验收清单对照（design-handoff §5）

| 验收项 | 结果 |
|---|---|
| 学生点一次 RSVP 人数 +1；再点不会 +2 | ✅ 第二次返回 409 |
| 看板 Confirmed RSVPs / 容量% / 剩余名额三处同时变 | ✅ 同一份 `stats` 渲染 |
| 报名名单出现刚报名的人，无需手动刷新 | ✅ 5 秒轮询 |
| 主办方发布活动后学生端立刻可见 | ✅ 发布 → `GET /api/events` 命中 |
| CAMPUS_ONLY 活动非本校看不到报名按钮 | ✅ 403 + UI 禁用 |
| 390px 无横向滚动 | ✅ 模板响应式 + 新增样式 |
| 断网仍能打开（素材本地化） | ✅ 4 张图 + 图标全部本地 |
| 演示前可重置数据 | ✅ 删 `.sym-data/uniloop-db.json` 重启，或 `POST /api/dev/reset` |

---

## 九、怎么演示（3 分钟，双窗口）

1. **左窗（学生）**：登录 → Discover 看主推卡 → 点 RSVP free → You're in
2. **右窗（主办方）**：`#/organiser` 一直开着 → 5 秒内看到 Confirmed RSVPs +1、名单出现 Jamie Chen
3. **左窗**：点 Loop AI「free Saturday morning…」→ 显示“fits your window / travel 12 min / matches outdoors”
4. **右窗**：Create event 发布 → 左窗刷新即可看到新活动
5. 收尾：切到 `CAMPUS_ONLY` 活动，用外校账号演示“campus only”拦截（或直接讲）

> 演示前重置：`rm -f .sym-data/uniloop-db.json && node server.js`
