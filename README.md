# UniLoop — merged build v2

校园活动 + 社团会员 + 主办方 Hub。**零依赖**（Node 18+ 内置模块），无 `npm install`，无构建依赖。

> 结构对齐队友版：`server.js + seed.js + package.json + public/index.html(单文件) + public/assets/`
> 源码在 `src/`（template.css / app.css / app.js / index.template.html），`node build.js` 内联生成 `public/index.html`。

## 运行

```bash
node build.js            # 生成 public/index.html（改了 src/ 才需要）
node server.js           # http://localhost:3000
PORT=3400 node server.js # 指定端口
```

数据：`.sym-data/uniloop-db.json`（原子写入，重启不丢）。删文件即恢复种子数据。

## 演示账号（密码 demo1234）

| 角色 | 账号 |
|---|---|
| 学生（MQ） | student@uniloop.demo |
| 主办方（Outdoors Society） | exec@uniloop.demo |
| 外校学生会（USYD exec） | exec2@uniloop.demo |

测试卡 `4242 4242 4242 4242`；尾号 `0002` 会被拒（演示失败态）。

## 页面

`#/` 发现（筛选：校区/时间/分类/免费/搜索 + 卡片）· `#/event/:id` 详情（地图 + 导航 + 价格 + RSVP + 收藏）
`#/societies` 社团目录（按校徽分组）· `#/society/:id` 社团主页（评分/相册/评价/加入）
`#/saved` 收藏 · `#/my` 我的票/社团/省下的钱
`#/organiser` 主办方 Hub（KPI/累计曲线/活动/相册/评价/发布）· `#/organiser/attendees/:id` 名单+CSV
`#/preview` 竖版预览（390×844 手机框）

## API

```
POST /api/auth/signup|login|logout   GET/PATCH /api/me
GET  /api/campuses | /api/venues | /api/societies | /api/societies/:id
POST /api/societies/:id/join | /api/societies/:id/reviews
GET  /api/events?campus_id=&when=week|7d|month|all&category=&free=1&q=
GET  /api/events/:id      POST/DELETE /api/events/:id/save      POST/DELETE /api/events/:id/rsvp
POST /api/recommend
GET  /api/exec/hub | /api/exec/dashboard | /api/exec/events/:id/attendees
POST /api/exec/events     POST /api/dev/reset      GET /_sym/health
```

## 测试

```bash
python3 test_api2.py     # 22 项契约（图片唯一/坐标/筛选/收藏/评价/主页/Hub/推荐/RSVP）
python3 test_mobile2.py  # 8 条路由 390px 横向溢出检查
```

## 真实 / 样例 / 未做

**真实**：账号会话、校徽与场地坐标、活动筛选、RSVP（唯一/容量/校区）、会员与会员价、收藏、评价与评分、主办方统计与名单、发布活动、CSV 导出、数据持久化。
**样例**：社团名为真实公开社团；活动/用户/评价/支付为合成数据；活动照片为占位图（Picsum）；校徽仅用于识别。
**未做**：真实支付、关注接口、评价回复、推送/邮件、活动编辑页、图片上传。
