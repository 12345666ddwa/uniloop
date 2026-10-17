# Meetup + Airbnb 拆解 → UniLoop 该怎么做

> 结论：我们现在的问题不是"不好看"，而是**把筛选堆成了两排 chip**（Today/This weekend/Free/Evening + Everything/Outdoors/Social…），既占地方又让人不知道从哪下手。
> Meetup 和 Airbnb 的解法都是：**搜索框承担"条件选择"，筛选只留 3–4 个"当前值"按钮**。

---

## 一、Meetup 发现页拆解（实测抓取，2026-10-18）

### 1. 页面骨架
```
顶部：Homepage | English | Log in | Sign up
Tab：Events | Groups
H1：Events near Sydney, AU
搜索区：[ Search for anything ] [ Neighborhood, city or zip ] [🔍]
筛选条：[Any day ˅] [Any size ˅] [Any type ˅] [Within 30 kilometers ˅] [⚙ Filter]
主体：活动卡片网格（无限滚动）
```

### 2. 卡片信息（这是关键）
实际抓到的卡片文本长这样：
```
7 seats left  🎉BBQ Party in Sydney + Free After Party
Sun, Oct 22 · 5:30 PM · 价格 A$5.00
4 seats left  [Special Event] Make New Friends in Sydney! 🌏
Monthly · Thu, Oct 22 · 5:30 PM
```
→ 他们**把用户决策需要的 4 件事直接印在卡上**：
1. **还有几个位**（seats left，稀缺感）
2. **什么时候**（日期 + 时间 + 是否周期性 Monthly）
3. **多少钱**（A$5.00，直接显示）
4. **是什么/谁的局**（标题 + 主办群体）

### 3. 交互模式
- 筛选器是**下拉按钮**，不是一排常驻 chip：点开才出选项，支持 Clear / Apply，手机上变成全屏面板（Back Button）。
- 搜索是**关键词 + 地点分开**两个输入框，符合"我要找什么"和"我在哪"两个独立心智。
- 顶部分 Events / Groups 两个**对象类型**，不是兴趣分类。

### 4. 为什么这样设计（用户需求映射）
| 用户的真实问题 | Meetup 的答案 |
|---|---|
| 我什么时候有空？ | Any day 下拉（今天/明天/本周末/自选日期） |
| 我在哪 / 愿走多远？ | Neighborhood + Within 30 km |
| 我想干什么？ | Any type（兴趣类型下拉） |
| 要花多少钱？ | 卡片直接显示价格 |
| 还有位吗？ | "7 seats left" 直接写在标题前 |
| 值得去吗？ | 人数/群体名 + 评价（详情页） |

---

## 二、Airbnb Experiences 搜索拆解（实测抓取）

### 1. 搜索栏 = 4 段式（不是一个大输入框）
```
[ Location: Experiences in Sydney ] [ Check in / Check out: Anytime ] [ Guests: Add guests ] [🔍]
```
点任意一段 → 进入该步的选择面板；面板底部给"搜索"按钮。

### 2. 分步逻辑（这就是你说的"先选地区，再选想玩什么"）
```
第 1 步 Where：搜索目的地 / 推荐城市 / 附近
第 2 步 When ：Anytime / 具体日期 / 周末
第 3 步 Who  ：人数（对应我们的"和谁去/几人"）
第 4 步 What ：体验类型（Originals / Type / Time of day）
→ 底部按钮："Show 1,000+ experiences"
```

### 3. 卡片信息
```
Hike amongst waterfalls in Blue Mountains
Outdoors · Haymarket · 9.5 hours
From $120 AUD per guest
★ 4.92 · 1,623 reviews          [Trending]
```
→ 层级非常清楚：**标题 → 类别·区域·时长 → 价格 → 评分·评论数 → 标签**。

### 4. 页面分区
- 顶部筛选：`Filters / Originals / Type / Time of day`
- 内容按**意图分区**：`Trending`（热门）、`Get outside`（户外）…每个区是横向 rail。

---

## 三、我们要改成什么样（按用户需求，不是拍脑袋）

### 3.1 用户找活动时真正要回答的 6 个问题
1. **什么时候**有空（时间窗）
2. **在哪**（校区/距离）
3. **想做什么**（兴趣）
4. **多少钱**（预算）
5. **还有位吗**（稀缺）
6. **值不值得**（口碑：评分/人数/主办方）

→ UI 必须让这 6 件事**一眼可见、一步可改**。

### 3.2 新版结构（替代现在那两排乱 chip）

```
┌────────────────────────────────────┐
│ UniLoop        Sydney      [头像]   │
│                                    │
│ What's your kind of day?           │
│ ┌────────────────────────────────┐ │
│ │ 🔍  Where · When · What      [→]│ │  ← 点开=分步面板（Airbnb 式）
│ └────────────────────────────────┘ │
│  Try: "free food" · "sunset walk"  │  ← 搜索推荐（真实热门词）
│                                    │
│ [Any day ˅] [Any type ˅] [Free ˅] [Within 3 km ˅]  ← 只留 4 个"当前值"
│                                    │
│ Happening soon            See all  │
│ [卡][卡][卡] →                     │
│ Free this week            See all  │
│ ← [卡][卡][卡]                     │
└────────────────────────────────────┘
```

**分步搜索面板**
```
Step 1 / 3   Where
  (●) Anywhere      ( ) Macquarie    ( ) USYD
  ( ) UNSW          ( ) UTS          ( ) WSU
  ── 推荐 ──  "Near campus" "City"

Step 2 / 3   When
  (●) Any day   ( ) Today   ( ) Tomorrow   ( ) This weekend   ( ) Next 7 days

Step 3 / 3   What
  (●) Anything  ( ) Outdoors  ( ) Social  ( ) Creative  ( ) Sport  ( ) Careers
  [ ] Free only

              [ Show 12 events → ]
```

### 3.3 卡片层级（你说的"更有层次感、一眼抓关键信息"）

```
┌──────────────────┐
│  [图片 16:10]  ⋯ │  ← 日期角标 + 收藏
│                  │
│ OUTDOORS · MQ    │  ← 1. 类别·校区（10.5px 大写字距）
│ Sunset walk      │  ← 2. 标题（14px/700，两行截断）
│ around the lake  │
│ 🕕 Sat 18 Oct    │  ← 3. 时间（11.5px，最显眼的元信息）
│   6:30 PM        │
│ 📍 Library lawn  │  ← 4. 地点（11.5px muted，截断）
│ ─────────────    │
│ Free   3 left    │  ← 5. 价格 + 余位（余位 ≤5 变珊瑚色）
└──────────────────┘
```
**信息优先级**：标题 > 时间 > 地点 > 价格/余位 > 类别/主办方。
（现在的卡片是把类别放最前、时间挤在一行里，层级反了。）

### 3.4 结果列表（搜完之后）
```
[84×84 图]  OUTDOORS · MQ
            Sunset walk around the lake
            Sat 18 Oct · 6:30 PM · Library lawn
            Free · 3 left            ★ 4.6
```

---

## 四、取舍清单（学什么 / 不学什么）

| 学（Meetup / Airbnb） | 不学（理由） |
|---|---|
| 搜索承担条件选择，筛选只留 4 个"当前值"按钮 | 不做 Meetup 的 Groups 二级对象（我们是单一活动流） |
| 卡片直印"余位 + 时间 + 价格" | 不学 Meetup 的无限滚动 + 广告位（我们是演示，要可控） |
| 分步搜索（Where → When → What） | 不做 Airbnb 的"人数"步骤（社团活动不是订房） |
| 每步给推荐（热门搜索词/热门区域） | 不做 Airbnb 的 Originals 品牌项目 |
| 按意图分区（Trending / 免费 / 本周） | 不做 10+ 个分区（一屏最多 2 条 rail） |
| 卡片层级：标题 > 时间 > 地点 > 价格/余位 | 不用 Meetup 的密集列表（我们要留白和质感） |
