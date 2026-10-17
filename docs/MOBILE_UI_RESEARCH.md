# 移动端 UI 调研（用于重做竖屏与初始界面）

> 目的：解决"竖屏很简陋、没有 App 质感、视觉逻辑乱、元素不对齐"。
> 结论先行：**竖屏不是把桌面缩小**，而是换一套结构：**底部 Tab + 单列信息流 + 横向 rail + 底部抽屉**，所有间距走 8pt 网格、所有左边缘对齐到同一条 16px 基线。

---

## 一、可参考的产品（真实在跑、移动端做得好）

| 产品 | 值得学的点 | 链接 |
|---|---|---|
| **Luma**（活动平台，最接近我们） | 搜索即入口、活动卡小图+标题+时间地点、主办方信息轻量、报名在底部抽屉 | https://luma.com/ ；移动端 393 屏截图集：https://uidiscovery.com/sites/ios-luma |
| **Partiful** | 强视觉封面 + 极简文案；日期/地点做成标签行；RSVP 一键 | https://partiful.com/ |
| **Eventbrite** | 分类 chip + 时间筛选 + 列表/地图切换；卡片信息密度适中 | https://www.eventbrite.com.au/ |
| **Airbnb（Experiences）** | 横向 rail 卡片（图 4:3+两行标题+评分），rail 之间留白统一 | https://www.airbnb.com/ |
| **Spotify Home** | 多条横向 rail、卡片等高、标题 2 行截断、rail 间距一致 |  |
| **Instagram** | 单列信息流 + 底部 Tab + 底部抽屉评论；点赞/回复交互 |  |
| **Meetup** | 兴趣 chip 筛选 + 附近活动列表 | https://www.meetup.com/ |

**灵感站（找具体页面截图）**：Mobbin（https://mobbin.com/ ）、UI Discovery（https://uidiscovery.com/ ）、Dribbble（https://dribbble.com/ ）、Figma Community 移动模板（https://www.figma.com/community/mobile-apps ）。

---

## 二、硬规范（有出处，直接照着做）

### 2.1 画布与安全区
- iOS 基准 **393 × 852**（iPhone 15/16）；Android 常用 **360–393** 宽。
- iOS：状态栏/Dynamic Island 约 **54pt**，大标题栏 **96pt**（滚动收起为 44pt），底部 Home Indicator **34pt** 不放可点元素。
- 来源：UIUGUR《Mobile App Layout & Grid Systems》 https://www.uiugur.com/blog/ios-vs-android-mobile-layout-guide

### 2.2 间距：8pt 网格（4pt 子网格）
- 所有间距/尺寸用 **8 的倍数**：8 / 16 / 24 / 32 / 48。
- **4pt** 只用于图标对齐、行高微调、chip 内部。
- 来源：Design for ducks《UI spacing cheat sheet》 https://designforducks.com/ui-spacing-cheat-sheet-a-complete-guide-2/ ；UIGuides《Grid Systems》 https://www.uiguides.com/guides/grid-systems-for-ui-design

### 2.3 栅格
- **移动 4 栏**，页面边距/栏间距 **16**（社区通用做法）。
- **桌面 12 栏**，栏间距 **24**，内容最大宽度居中。
- 来源：同上 UIGuides。

### 2.4 触控与可达性
- 触控目标 **≥ 44×44pt（iOS）/ 48×48dp（Android）**。
- 正文对比度 ≥ 4.5:1；状态不能只靠颜色（满员/已报名要有文字）。
- 来源：UIUGUR（触控目标）+ design-handoff.md（对比度）

### 2.5 字号阶梯（移动）
| 用途 | 字号/行高 | 字重 |
|---|---|---|
| 页面大标题（hero） | 30–34 / 1.1 | 衬线 400 或 sans 700 |
| 区块标题 | 19 / 1.3 | 650 |
| 卡片标题 | 15–16 / 1.3 | 650（最多 2 行） |
| 正文 | 14–15 / 1.5 | 400 |
| 元信息 | 12–12.5 / 1.4 | 500（颜色 muted） |
| 微标签（eyebrow） | 11 / 1.2 | 700 + 字距 .06em 大写 |

### 2.6 组件尺寸（本方案取值）
- 页面边距 **16**；区块间距 **24–32**；卡片内边距 **12–14**
- 活动卡（rail）**148 × 196**：图 96 高（16:10 裁切）+ 标题 2 行 + 元信息 1 行 + 价格
- 列表行：缩略图 **72×72**（圆角 12）+ 右侧三行文字
- 圆角：卡片 **16–18**，chip **999**，按钮 **12**，底部抽屉 **24**（顶部两角）
- 阴影：`0 1px 2px rgba(22,33,28,.05), 0 12px 28px -18px rgba(22,33,28,.28)`

---

## 三、竖屏结构（这次要落地的）

```
┌─────────────────────────┐
│ 品牌 + 城市 + 头像        │  ← 44–56 高
│                         │
│ What's your kind of day? │  ← hero，衬线 30
│ [ 🔍 搜索框           ]  │  ← 主视觉，56 高，纯白胶囊
│ (Today)(Weekend)(Free)  │  ← 快捷筛选 chip
│ (All)(Outdoors)(Social) │  ← 分类 chip，横向滚动
├─────────────────────────┤
│ Happening soon    See all│
│ [卡][卡][卡] → 自动横滚   │  ← rail：148×196
│ Free this week    See all│
│ ← [卡][卡][卡]           │  ← 第二条 rail（反向滚）
│ Campuses                 │
│ [校徽][校徽][校徽][校徽]   │
├─────────────────────────┤
│  Home   Search  Saved  Me │  ← 底部 Tab，56+安全区
└─────────────────────────┘
```

**交互**
- 输入/点 chip → 进入"结果模式"：rail 收起，变成**单列列表行**（缩略图 72 + 标题 2 行 + 元信息 + 价格），顶部显示 `N results · Clear`。
- 点卡片 → **底部抽屉**（详情摘要 + 报名按钮）；抽屉里可再跳完整详情页。
- 返回 → 保留上一次的搜索/筛选（history state）。
- rail 自动滚动：缓慢平移，hover/触摸暂停，`prefers-reduced-motion` 时不动。

---

## 四、"元素对齐"检查清单（交付前逐条过）

1. 所有内容左边缘对齐到 **16px** 同一条线（标题、卡片、列表、按钮）。
2. 同一屏内**只有一种圆角体系**（卡片 16、chip 999、按钮 12）。
3. 卡片**等高**；图片统一 **16:10** 裁切；文字统一 **2 行截断**（`-webkit-line-clamp`）。
4. 所有纵向间距来自 **8 的倍数**（8/16/24/32），不允许 13、19 这种值。
5. 图标与文字**视觉居中**（用 flex align-items:center，不靠 margin 硬凑）。
6. 价格/时间用 **tabular-nums**，换数字不抖动。
7. 横向 rail：**首个卡片左边距 = 16**、卡间距 = 12、最后一张右边距 = 16。
8. 底部 Tab 与 Home Indicator 之间留 **≥ 16**；Tab 高 56。
9. 触控区 ≥ **44×44**（小图标按钮要加 padding）。
10. 深浅背景交界处，文字对比度 ≥ **4.5:1**。

---

## 五、可复用源码 / 模板（如果以后要上框架）

| 资源 | 说明 |
|---|---|
| `osmanyz/ui-kits-collection` | React / React Native / Vue 的 UI kit 合集，找现成组件快 |
| `gluestack-ui` / `UI Kitten` | React Native 组件库，内置间距/字号 token |
| LogRocket《20 free Flutter templates》 | Flutter 模板清单，适合直接改 | 
| `adminlte.io` React Native 模板清单（2026） | Obytes / Instamobile 等完整 App 模板 |
| Mobbin / UI Discovery | 真实 App 的逐屏截图（Luma 393 屏可逐屏对照） |

> 我们当前技术栈是零依赖原生 HTML/CSS/JS，不引入框架；以上用于"对照参考"和"以后要迁移时用"。
