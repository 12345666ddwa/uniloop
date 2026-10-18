# UniLoop 功能复查 + 使用流程说明（v3.5.0）

> 复查方式：真实启动服务 + API 断言 + 浏览器实测（不是看代码猜）。
> 本文件同时作为给队友/评委的“怎么用”说明。

---

## 一、本轮 6 项修复（含验证证据）

| # | 问题 | 修复 | 验证结果 |
|---|---|---|---|
| 1 | 主页活动卡长短不一 | 标题固定两行高度（`min-height:2.52em`）+ 卡片 `height:100%` + 底部信息 `margin-top:auto` + 网格 `grid-auto-rows:1fr` | 网格卡片 **8 张全部 348px**；横向 rail **6 张全部 322px** |
| 2 | `#searchSheet` 左下角白色浮窗残留 | 未打开时 `visibility:hidden; opacity:0; pointer-events:none; display:none`，并用 `translateY(calc(100% + 60px))` 完全移出视口（桌面 bottom:40px 导致的 164px 露出已消除） | `display:none / visibility:hidden / opacity:0` |
| 3 | Dark/Light 切换不明显 | 移到侧栏**右下角**，两个图标按钮（☀ / ☾），选中态反色；手机端显示在“我的”页面 | 按钮定位 `(196,842)`，侧栏 right=248 / bottom=900 → 右下角 |
| 4 | 主页标题单调 | 4 组标题每 8 秒轮换（随 Hero 图切换，260ms 淡入淡出）：What's on this week / Make a day of it / Find your people / Something worth showing up for | 8.6 秒后标题由 “Make a day of it.” → “Find your people.” |
| 5 | 队友功能未复查 | 见下方第二节（逐项状态 + 测试步骤） | 全部标注验证方式 |
| 6 | 活动详情/官方链接是自己那场 AI 活动 | 数据里排除 “Sym AI Open / Inter-Uni Hackathon”；首屏改为真实社团活动 | 详情页：**Clean the Coves（Sydney University Wildlife Society）**，官方链接 `https://clubs.usu.edu.au/rsvp_boot?id=384864` |

---

## 二、队友能力逐项复查

图例：✅ 可用并已实测 ｜ 🟨 可用但有已知限制 ｜ ⬜ 未做

| 能力 | 状态 | 入口 | 怎么测（30 秒） |
|---|---|---|---|
| 注册（含用户名查重） | ✅ | 右上角头像 → Sign up | 用户名输入 `jamie.lee` → 红✗；输入自定义 → 绿✓ → 创建 |
| 登录 / 登出 / 会话（7 天） | ✅ | 头像 → Log in；侧栏底部显示已登录姓名 | 用 `student@uniloop.demo / demo1234` 登录 |
| 学生 / 主办方角色 | ✅ | 主办方账号登录后侧栏出现 Organiser / Scan tickets / Members | `exec@uniloop.demo` |
| 真实社团与活动数据 | ✅ | 首页 / Societies | 409 场即将开始的活动、1113 个社团、5 所学校 |
| 搜索 + 分步筛选（Where/When/What） | ✅ | 首页搜索胶囊 | 点 Where 选 MQ → When 选周末 → 显示匹配数与结果 |
| 具体某一天筛选 | ✅ | When 面板底部 21 天日期条 | 选某天 → 结果数量变化 |
| 收藏（Saved） | ✅ | 卡片右上书签；侧栏 Saved | 未登录点书签 → 弹登录 → 登录后自动收藏（已验证 aria=true） |
| RSVP（容量/唯一/校区限制/会员价） | ✅ | 活动页 RSVP 按钮 | 连点两次不会 +2；满员显示 Full；外校报 CAMPUS_ONLY 返回 403 |
| 我的票（含二维码） | ✅ | 侧栏 My stuff | 点 “Show ticket” → 二维码 + 票码（离线 SVG 生成） |
| 票列表收敛 | ✅ | My stuff | 默认 3 张 + “Show all 84 tickets”；过期票单独折叠 |
| 扫码核销 | ✅ | 侧栏 Scan tickets（主办方） | 粘贴票码 → ✓ 姓名 + 签到时间；再扫一次提示 already |
| 摄像头扫码 | 🟨 | Scan tickets → Scan with camera | 需 localhost 或 HTTPS；已接 jsQR，手机浏览器实测一次即可 |
| 成员名单 | ✅ | 侧栏 Members | 显示会员姓名/邮箱/付费金额/总数 |
| 看板 KPI（RSVPs/满座率/浏览/营收） | ✅ | Organiser | 4 个数字块，随报名实时变化 |
| 累计曲线 + 容量线 + 预测 | ✅ | Organiser | 曲线为真实 14 天累计，虚线为容量，底部给出“还差 N 人” |
| 实时刷新（3 秒）+ 新报名高亮 | ✅ | Organiser 的 Recent RSVPs | 外部报名后 3 秒内：行橙色闪动 + 顶部 toast + KPI +1 |
| 发布活动 | ✅ | Organiser → ＋ New event | 填表发布 → 返回 `id: evt_426`，`/api/events/:id` 可查 |
| 活动官方链接 | ✅ | 卡片底部 “Official page ↗” / 活动页顶部按钮 | 打开 `clubs.usu.edu.au…`、`campus.hellorubric.com…` 等真实报名页 |
| 地图 + 导航 | ✅ | 活动页 Where | OSM 内嵌图 + Google directions + Apple Maps |
| 社团主页 + 官方社媒链接 | ✅ | Societies → 点社团 | Instagram / Luma / 官网 三个入口 |
| 多校筛选 | ✅ | 搜索 Where / 首页校区行 | 5 所学校各有活动与社团 |
| 兴趣推荐（For you） | 🟨 | 后端 `/api/recommend` | 接口可用（返回 results/excluded），**前端入口未接** |
| 评价 | 🟨 | 主办方页底部 | 种子评价可展示；学生端发表评价入口未做 |
| 支付 | 🟨 | 加入社团 / 付费 RSVP | 模拟支付，测试卡 `4242 4242 4242 4242`，尾号 0002 拒付 |

---

## 三、使用流程

### A. 学生（3 分钟）
1. 打开首页 → 搜索胶囊里选 **Where（校区）→ When（时间/具体某天）→ What（类型）**
2. 点任意活动卡 → 活动页：看时间、地点、地图、价格、余位
3. 未登录点 **Save / RSVP** → 立即弹登录 → 登录后**自动完成刚才的操作**
4. 侧栏 **My stuff** → 看票、二维码、会员、省了多少钱
5. 想加入社团拿会员价 → 社团主页 → Join → 测试卡付款 → 之后报名自动按会员价

### B. 主办方（3 分钟）
1. `exec@uniloop.demo` 登录 → 侧栏 **Organiser**
2. 顶部 4 个 KPI + 累计曲线（含容量虚线、预测）
3. **Recent RSVPs**：每 3 秒刷新；有新报名会**橙色高亮 + toast**
4. **＋ New event** 发布活动 → 学生端立即可见
5. **Members** 看会员名单；**Scan tickets** 核销门票

### C. 扫码签到（演示高潮）
1. 手机：My stuff → Show ticket → 二维码
2. 电脑：Organiser → Scan tickets → 粘贴票码（或手机摄像头扫描）
3. 结果：✓ 姓名 + 签到时间；重复扫描提示 “already checked in”

---

## 四、已知限制（诚实声明）

1. 支付是**模拟**的，没有真实扣款；仅用于演示会员价链路。
2. 数据是导入的公开活动信息 + 合成账号/报名/评价；活动官方链接指向真实报名页。
3. 摄像头扫码需要 **localhost 或 HTTPS**（浏览器安全限制）。
4. 发布活动时，场地坐标默认取**社团所在校区**；自由填写的场地名不会自动地理编码。
5. 兴趣推荐的**前端界面**还没接（后端 `/api/recommend` 已可用）。
6. 数据存单个 JSON 文件（`~/.sym-data/uniloop-db.json`），单机演示足够，多实例部署需换 Postgres。
