# UniLoop · UI 交接说明

给负责前端 / 后端的同学。看完这份就能开工，不需要再问设计。

---

## 1. 交付范围

| 角色 | 桌面 | 手机 |
|---|---|---|
| 学生 | 发现页（筛选、AI 推荐、活动卡、RSVP） | 同样功能，卡片转纵向，底部 tab |
| 主办方 | 概览（KPI、报名趋势、活动表、报名名单、AI 到场预估）、发布活动 | 概览浓缩版 + 发布活动 |

两个版本（A 编辑风格 / B 信息流）**功能一致、数据一致**，只是版式不同。挑一个实现即可，组件命名按第 4 节。

原型里所有交互都能点：RSVP、筛选、搜索、发布活动、角色切换。打开 `index.html` 边点边对照本文。

---

## 2. 页面与路由建议

```
/                     学生 · 发现（默认）
/events/:id           活动详情（原型里用主推卡代替，MVP 可先不单独做页）
/my-events            我报名的
/organiser            主办方 · 概览
/organiser/new        发布活动（原型里是弹层，独立页面也行）
/organiser/:id/attendees  报名名单（弹层或独立页）
```

角色切换在真实产品里由登录身份决定，原型里保留开关是为了**演示时一人操作两端**。上线前去不掉的话，至少加一层「仅 Demo 可见」的隐藏。

---

## 3. 数据契约

### 3.1 Event

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 稳定 ID，不要用自增数字 |
| `title` | string | ≤ 48 字符，超出在卡片上两行截断 |
| `description` | string | 一两句，卡片上只显示一行到两行 |
| `category` | enum | `outdoors \| social \| creative \| sport \| careers \| other` |
| `campus_id` / `campus_name` | string | 主办校区 |
| `venue` | string | 具体地点，卡片上只显示第一段（逗号前） |
| `starts_at` / `ends_at` | ISO-8601 | **必须带时区**，例：`2026-10-24T09:00:00+11:00` |
| `audience_scope` | enum | `CAMPUS_ONLY \| OPEN_TO_ALL` |
| `society_id` / `society_name` | string | 主办社团 |
| `cover_image_url` | string | 16:10 裁切；缺失时用分类默认图 |
| `capacity` | int \| null | null = 不限人数 |
| `status` | enum | `DRAFT \| PUBLISHED \| CANCELLED` |
| `rsvp_count` | int | **服务端算出来的**，前端不要自己累加 |

### 3.2 RSVP

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | |
| `event_id` / `user_id` | string | |
| `display_name` | string | 名单里显示 |
| `status` | enum | `CONFIRMED \| CANCELLED` |
| `created_at` / `updated_at` | ISO-8601 | 名单按 `created_at` 倒序 |

**唯一约束**：`(event_id, user_id)` 上只能有一条 `CONFIRMED`。连点两次 RSVP 不能变成 2 人——这是评委最容易试出来的 bug。

### 3.3 推荐接口

请求：

```json
{
  "origin_campus": "mq_sydney",
  "available_from": "2026-10-24T09:00:00+11:00",
  "available_to": "2026-10-24T12:00:00+11:00",
  "interests": ["outdoors"]
}
```

响应：

```json
{
  "results": [
    {
      "event_id": "evt_sydney_hike_01",
      "match_reason": "Saturday morning is clear and the venue is 20 minutes from campus.",
      "match_tags": ["outdoors", "open_to_all"],
      "has_time_conflict": false,
      "travel_minutes": 20
    }
  ]
}
```

**分工要写进 PPT**：时间冲突、跨校权限、距离这些**用规则算**，模型只负责把参数解析成结构化条件 + 生成一句人话理由。这样演示不会翻车，也经得起评委追问。

### 3.4 看板估算

| 字段 | 说明 |
|---|---|
| `rsvp_count` | 实际报名数 |
| `capacity_filled_rate` | `rsvp_count / capacity` |
| `page_views` | 详情页浏览量 |
| `predicted_attendees_low` / `_high` | AI 预估到场区间，**必须和真实报名数分开存** |

UI 上所有预估值都要带「Estimate」字样。原型里已经这么写了，别在实现时删掉。

---

## 4. 组件与状态

### 4.1 必须实现的组件

| 组件 | 出现位置 | 要点 |
|---|---|---|
| `EventCard`（A）/ `EventRow`（B） | 学生 · 发现 | **一个版本只用一种骨架**；主推项是同一组件的 `size="lead"` |
| `ScopeTag` | 卡片、活动条、报名表 | `OPEN TO ALL` / `MACQUARIE ONLY`；用文字区分，不能只靠颜色 |
| `RsvpButton` | 卡片、详情 | 三态：`RSVP free` → `You're in` → （满员）`Full` |
| `AiPrompt` | 学生 · 发现 | 输入 + 提交；提交后展示理由，不是只弹 toast |
| `Kpi` | 主办方 | 数字用等宽数字（`font-variant-numeric: tabular-nums`），否则变化时会抖 |
| `TrendChart` | 主办方 | 7 天数据；今天之后的日子留空，不要补 0 画成断崖 |
| `AttendeeTable` / `AttendeeList` | 主办方 | 桌面用表格，手机用列表，字段一致 |
| `EstimateCard` | 主办方 | 珊瑚色左边线 + 「Estimate, not a measurement.」 |

### 4.2 状态清单（现在原型里没有，实现时必须补）

- **加载**：卡片用骨架屏（灰块），不要转圈盖住整页
- **空结果**：筛选后没活动 → 一句「Nothing matches that filter yet.」+ 清除筛选按钮
- **空名单**：主办方还没有报名 → 「No RSVPs yet. Share the event link.」
- **错误**：RSVP 失败 → 按钮回到原状态 + 一行提示，不要静默失败
- **满员**：按钮变 `Full` 且置灰，不能还能点
- **未登录 / 非本社成员**：进主办方路由前就要拦

### 4.3 无障碍底线

- 正文对比度 ≥ 4.5:1（两个版本都过了）
- 可点区域 ≥ 44×44px（手机端 RSVP 按钮已满足）
- 焦点可见：`Tab` 能走完筛选 → 卡片 → RSVP
- 状态不只靠颜色：满员 / 已报名都要有文字
- 图片都要有 `alt`（原型里活动图 alt = 活动名）

---

## 5. 验收清单

演示前一条条过，全过才算能上台：

- [ ] 学生点一次 RSVP，人数 +1；**再点一次不会变成 +2**
- [ ] 主办方看板的 Confirmed RSVPs、容量百分比、剩余名额三处**同时**变化
- [ ] 报名名单里出现刚报名的这个人，且不用手动刷新
- [ ] 主办方发布活动后，学生端列表立刻能看到
- [ ] 切到 `CAMPUS_ONLY` 的活动，非本校账号看到的是「仅限本校」而不是报名按钮
- [ ] 手机宽度 390px 下无横向滚动条
- [ ] 断网状态下页面仍能打开（图片本地化，别依赖外链）
- [ ] 演示前把数据重置到初始值（报名 48/60），别接着上次的状态演

---

## 6. 给实现的具体建议

**前端结构**（React 为例，Vue 同理）：

```
App
├─ StudentDiscover
│   ├─ FilterBar
│   ├─ AiPrompt
│   ├─ EventCard[]        size="lead" | "default"
│   └─ CampusPulse
└─ OrganiserDashboard
    ├─ EventStrip
    ├─ KpiRow
    ├─ TrendChart
    ├─ EstimateCard
    └─ AttendeeTable
```

**状态共享**：报名数和名单放在同一个 store（或同一个 query cache）里，学生端和主办方都从这里读。不要各存一份——双屏联动的 bug 九成出在这里。

**「实时」怎么做**：MVP 有两种都够用 ——
- 简单：主办方页面每 5 秒轮询 `/events/:id`；
- 好一点：SSE（`/events/:id/stream`）。房间就两个人看，别上 WebSocket + 消息队列。

原型里 90 秒自动 +1 只是为了让评委看到"会动"，真实现别用定时器造假数据。

**演示兜底**：提前把两个浏览器窗口并排放好，URL 参数带上事件 ID；万一实时同步挂了，主持人手动刷新一次也看不出破绽。

---

## 7. 已知限制（写进 PPT 的「未来工作」里）

- 无账号体系、无后端持久化，刷新即重置
- 支付、私信、完整会员管理都不做（原型里也没有这些按钮，避免评委去点）
- AI 推荐是规则 + 文案，不是训练出的模型；对外表述保持这个口径
