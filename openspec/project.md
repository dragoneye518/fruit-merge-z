#  产品需求文档 (PRD)
1. 产品概述
1.1 产品定义
产品名称: 合成水果 (Fruit Merge)
产品类型: 休闲益智类小游戏
产品定位: 一款基于物理引擎的合成类休闲游戏，玩家通过投放水果，使相同水果碰撞合成更大的水果，挑战更高分数。
核心玩法:

点击屏幕投放水果
相同水果碰撞自动合成
合成获得分数
水果堆积超出警戒线游戏结束

产品特色:

✨ 真实的物理引擎，水果碰撞、滚动符合自然规律
🎯 简单易上手，单手操作
🏆 高分挑战，刷新纪录成就感
🎨 清新可爱的美术风格
🎵 轻松愉悦的音效体验


1.2 产品背景
市场机会:

抖音日活 6 亿+，小游戏月活 1.5 亿+
合成类游戏持续火爆（如合成大西瓜）
用户对轻量化休闲游戏需求旺盛
碎片化娱乐场景需求增长

竞品分析:
竞品优势劣势我们的差异化合成大西瓜玩法经典，用户基数大缺乏创新，用户疲劳优化物理体验，增加道具系统2048规则简单策略性强，门槛高更休闲，无需思考欢乐消消乐关卡丰富重度运营轻量化，即开即玩

1.3 商业模式
V1.0 (免费版):

完全免费
无内购
通过广告变现（可选，抖音分成）

V2.0 (商业化):

道具内购（万能球、炸弹）
皮肤商城
去广告会员


2. 用户分析
2.1 目标用户画像
主力用户群:

年龄: 18-35 岁
性别: 女性 60%，男性 40%
职业: 学生、白领、自由职业者
使用场景: 通勤、休息、排队等碎片化时间

用户特征:

喜欢简单易上手的游戏
没有大量时间投入
喜欢分享炫耀高分
对可爱清新的美术风格有好感


2.2 用户需求分析
用户需求优先级解决方案快速上手，无学习成本P0新手引导，点击即投放碎片时间娱乐P0单局 2-5 分钟挑战高分成就感P0最高分记录 + 新纪录提示分享炫耀P1分享到抖音（V1.1）持续新鲜感P1道具系统、皮肤系统（V1.1+）

2.3 用户使用路径
打开抖音 
  → 发现小游戏入口
  → 点击《合成水果》
  → 加载游戏（< 3s）
  → 看到开始界面
  → 点击"开始游戏"
  → 游戏教程（首次）
  → 开始投放水果
  → 水果合成获得分数
  → 继续投放直到游戏结束
  → 查看分数和最高分
  → 点击"重新开始"或"分享"
```

---

## 3. 产品目标

### 3.1 业务目标

**V1.0 上线目标** (1 个月内):
- DAU: 10,000+
- 人均游戏时长: 8 分钟
- 次日留存: 30%+
- 7 日留存: 15%+

**V1.5 成长目标** (3 个月内):
- DAU: 50,000+
- 人均游戏时长: 12 分钟
- 次日留存: 40%+
- 7 日留存: 20%+

---

### 3.2 用户体验目标

- 启动速度: < 3 秒
- 游戏流畅度: 稳定 50+ FPS
- 操作响应: < 100ms
- 无明显卡顿或闪退
- 新手引导完成率: 90%+

---

## 4. 功能需求

### 4.1 功能清单

#### 4.1.1 核心功能 (P0 - V1.0 必须)

**F1: 游戏主循环**
- 描述: 完整的游戏流程，包括开始、游戏中、结束
- 优先级: P0
- 交付标准: 
  - 水果投放功能正常
  - 物理碰撞效果真实
  - 合成逻辑正确
  - 游戏结束判定准确

**F2: 水果投放系统**
- 描述: 玩家点击屏幕投放水果
- 优先级: P0
- 功能点:
  - 触摸移动时，投放位置跟随手指
  - 显示投放辅助线
  - 点击屏幕投放当前水果
  - 投放后切换到下一个水果
  - 投放冷却 500ms
- 交付标准:
  - 投放位置准确
  - 辅助线实时更新
  - 无连续投放问题

**F3: 水果合成系统**
- 描述: 相同水果碰撞自动合成更大水果
- 优先级: P0
- 规则:
  - 两个相同类型的水果碰撞
  - 消失并生成下一级水果
  - 在两个水果的中点位置生成
  - 增加对应分数
  - 播放合成音效
- 水果等级:
```
  Lv1: 樱桃 (32px) → 1 分
  Lv2: 番茄 (45px) → 3 分
  Lv3: 柠檬 (58px) → 6 分
  Lv4: 椰子 (75px) → 10 分
  Lv5: 猕猴桃 (65px) → 15 分
  Lv6: 桃子 (90px) → 21 分
  Lv7: 柠檬片 (38px) → 28 分
  Lv8: 橙子片 (45px) → 36 分
  Lv9: 西瓜 (120px) → 45 分 (最高级)
F4: 分数系统

描述: 记录和显示当前分数和最高分
优先级: P0
功能点:

游戏中实时显示当前分数
本地存储历史最高分
游戏结束时对比最高分
新纪录给予特殊提示


交付标准:

分数计算准确
最高分持久化存储
UI 显示清晰



F5: 游戏结束判定

描述: 水果堆积超出警戒线触发游戏结束
优先级: P0
规则:

警戒线位置: 距顶部 200px
判定条件: 有水果超出警戒线且处于静止状态
延迟判定: 1 秒后检测避免误判


交付标准:

判定准确无误判
触发时机合理



F6: 游戏结束面板

描述: 显示游戏结束信息和操作按钮
优先级: P0
内容:

半透明遮罩
白色圆角面板
"游戏结束" 标题
本次得分（大号红色数字）
历史最高分（小号灰色文字）
新纪录提示（条件显示，金色 + emoji）
"重新开始" 按钮（绿色）


交付标准:

UI 美观
信息展示准确
按钮响应正常



F7: 重新开始功能

描述: 点击按钮重新开始游戏
优先级: P0
功能点:

清空所有水果
重置分数为 0
重置游戏状态
生成新的初始水果


交付标准:

清理完全
无残留数据




4.1.2 基础功能 (P1 - V1.0 可选)
F8: 音效系统

描述: 为游戏操作添加音效反馈
优先级: P1
音效列表:

投放音效 (drop.mp3)
合成音效 (merge.mp3)
游戏结束音效 (gameover.mp3)


交付标准:

音效触发时机准确
音量适中
可静音



F9: 下一个水果预览

描述: 显示即将投放的下一个水果
优先级: P1
位置: 屏幕右上角
交付标准:

显示准确
不遮挡游戏区域



F10: 视觉反馈

描述: 增强游戏操作的视觉反馈
优先级: P1
内容:

合成时的粒子特效
投放时的水果缩放动画
新纪录的闪烁效果


交付标准:

动画流畅
不影响性能




4.1.3 扩展功能 (P2 - V1.1+)
F11: 道具系统

描述: 提供游戏辅助道具
优先级: P2
道具类型:

万能球: 可与任意水果合成，生成对应下一级水果
炸弹: 消除指定范围内的水果


获取方式:

每日登录赠送 3 个
观看广告获得 1 个
内购（V2.0）


交付标准:

道具效果符合预期
使用次数限制正确
UI 显示清晰



F12: 排行榜

描述: 好友和全球排行榜
优先级: P2
功能点:

好友排行榜（基于抖音好友）
全球排行榜（Top 100）
每周重置


交付标准:

数据准确
更新及时



F13: 分享功能

描述: 分享游戏成绩到抖音
优先级: P2
分享内容:

游戏截图
当前分数
小游戏链接


交付标准:

分享流程顺畅
分享图片美观



F14: 每日任务

描述: 每日任务系统增加粘性
优先级: P2
任务示例:

游戏 3 局
达到 100 分
合成 1 个西瓜


奖励: 道具 + 积分
交付标准:

任务进度准确
奖励发放正常




4.2 功能优先级矩阵
功能价值成本优先级版本水果投放高中P0V1.0水果合成高高P0V1.0分数系统高低P0V1.0结束判定高中P0V1.0结束面板高低P0V1.0重新开始高低P0V1.0音效系统中低P1V1.0下一个预览中低P1V1.0视觉反馈中中P1V1.0道具系统中高P2V1.1排行榜中高P2V1.1分享功能高中P2V1.1每日任务中高P2V1.2

5. 交互设计
5.1 游戏流程图
mermaidgraph TD
    A[游戏启动] --> B[资源加载]
    B --> C{首次游戏?}
    C -->|是| D[新手引导]
    C -->|否| E[开始界面]
    D --> E
    E --> F[点击开始游戏]
    F --> G[游戏进行中]
    G --> H[投放水果]
    H --> I[水果碰撞]
    I --> J{相同水果?}
    J -->|是| K[合成新水果]
    J -->|否| G
    K --> L[增加分数]
    L --> M{超出警戒线?}
    M -->|否| G
    M -->|是| N[游戏结束]
    N --> O[显示结束面板]
    O --> P{点击重新开始?}
    P -->|是| F
    P -->|否| Q[返回首页]
```

---

### 5.2 核心交互流程

#### 5.2.1 投放水果交互
```
用户操作 → 系统响应
---------------------------------------
触摸移动  → 投放位置跟随手指
          → 显示虚线辅助线
          → 当前水果预览跟随移动

触摸结束  → 在投放位置创建水果
          → 播放投放音效
          → 水果受重力下落
          → 切换到下一个水果
          → 进入 500ms 冷却
```

**边界条件**:
- 投放位置限制在屏幕左右边界内
- 冷却期间无法投放
- 游戏结束后无法投放

---

#### 5.2.2 水果合成交互
```
触发条件 → 系统响应
---------------------------------------
相同水果碰撞 → 两个旧水果消失
            → 中点位置生成新水果
            → 播放合成音效
            → 播放粒子特效
            → 增加对应分数
            → 分数数字闪烁
```

**防重复机制**:
- 同一对水果只合成一次
- 100ms 内的重复碰撞忽略

---

#### 5.2.3 游戏结束交互
```
触发条件 → 系统响应
---------------------------------------
水果超警戒线 → 延迟 1 秒检测
            → 确认游戏结束
            → 播放结束音效
            → 显示半透明遮罩（渐入）
            → 显示结束面板（缩放动画）
            → 展示当前分数
            → 展示历史最高分
            → 如果是新纪录显示特殊提示
```

---

### 5.3 手势操作定义

| 手势 | 响应区域 | 功能 | 备注 |
|------|---------|------|------|
| 单指移动 | 游戏区域 | 移动投放位置 | 游戏进行中 |
| 单指点击 | 游戏区域 | 投放水果 | 游戏进行中 |
| 单指点击 | 重新开始按钮 | 重新开始游戏 | 游戏结束时 |
| 单指点击 | 分享按钮 | 分享成绩 | 游戏结束时 |
| 单指点击 | 道具按钮 | 使用道具 | V1.1 |

---

### 5.4 状态转换图
```
[开始界面] 
    ↓ 点击开始
[游戏进行中]
    ↓ 水果超线
[游戏结束]
    ↓ 点击重新开始
[游戏进行中]
    ↓ 退出游戏
[开始界面]
```

---

## 6. 视觉设计

### 6.1 设计风格

**整体风格**: 清新、可爱、温暖

**色彩方案**:
- 主色调: 暖黄色 (#FFF8DC)
- 辅助色: 粉红色 (#FF6B91)、绿色 (#6BCB77)
- 强调色: 金色 (#FFD700)
- 文字色: 深灰 (#333333)、灰色 (#666666)

**字体**:
- 标题: 思源黑体 Bold
- 正文: 思源黑体 Regular
- 数字: Arial Bold

---

### 6.2 UI 设计规范

#### 6.2.1 游戏界面布局
```
┌─────────────────────────────┐
│  分数: 148      [下个水果预览] │  ← 顶部栏 (高度: 120px)
├─────────────────────────────┤
│                             │
│     ～～～ 警戒线 ～～～      │  ← 警戒线 (y: 200px)
│                             │
│                             │
│      [当前水果预览]          │  ← 投放区 (y: 100px)
│          ↓                  │
│      [辅助虚线]             │
│                             │
│                             │
│      🍒 🍋                  │
│    🥥  🍑  🍅              │  ← 游戏区域
│  🍋 🥝 🍊 🍒              │
│ 🍑 🍅 🥥 🍋 🍊           │
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← 地面 (高度: 40px)
└─────────────────────────────┘

右侧悬浮按钮:
  [💣] ← 炸弹 (V1.1)
  [⭐] ← 万能球 (V1.1)
```

---

#### 6.2.2 游戏结束面板设计
```
┌─────────────────────────────┐
│ ▓▓▓▓▓ 半透明遮罩 ▓▓▓▓▓▓ │
│                             │
│   ┌─────────────────┐      │
│   │   游戏结束       │      │
│   │                  │      │
│   │   本次得分        │      │
│   │      148         │  ← 大号红色
│   │                  │      │
│   │  历史最高: 200    │  ← 小号灰色
│   │  🎉 新纪录！     │  ← 条件显示
│   │                  │      │
│   │ ┌─────────────┐ │      │
│   │ │  重新开始   │ │  ← 绿色按钮
│   │ └─────────────┘ │      │
│   │                  │      │
│   │    [分享]        │  ← V1.1
│   └─────────────────┘      │
│                             │
└─────────────────────────────┘
面板尺寸:

宽度: 屏幕宽度 * 0.8
高度: 屏幕高度 * 0.4
圆角: 20px
居中显示


6.3 水果视觉设计
设计要求:

卡通风格，圆润可爱
色彩饱和度高
轮廓清晰易识别
统一光影效果（左上光源）

水果尺寸规范 (设计稿 750x1334):
水果直径 (px)文件大小格式樱桃64< 20KBPNG番茄90< 30KBPNG柠檬116< 40KBPNG椰子150< 50KBPNG猕猴桃130< 45KBPNG桃子180< 60KBPNG柠檬片76< 25KBPNG橙子片90< 30KBPNG西瓜240< 80KBPNG

6.4 动画设计
投放动画:

水果从小到大缩放 (0.8 → 1.0)
时长: 200ms
缓动函数: ease-out

合成动画:

旧水果淡出 + 缩小
新水果从小到大 + 旋转
粒子特效放射
时长: 300ms

面板动画:

遮罩渐入 (opacity: 0 → 0.6)
面板缩放进入 (scale: 0.8 → 1.0)
时长: 400ms
缓动函数: ease-out-back

分数动画:

数字变化时放大 (scale: 1.0 → 1.2 → 1.0)
颜色闪烁 (黄色 → 白色 → 黄色)
时长: 300ms


7. 数据指标
7.1 核心数据指标
用户规模指标:

DAU (日活跃用户)
MAU (月活跃用户)
新增用户数
累计用户数

用户行为指标:

人均游戏时长
人均游戏局数
平均每局时长
分数分布

留存指标:

次日留存率
3 日留存率
7 日留存率
30 日留存率

分享指标:

分享率 (分享用户/总用户)
分享回流率
K 因子


7.2 数据埋点方案
关键埋点事件:
javascript// 1. 游戏启动
tt.reportAnalytics('game_start', {
  user_id: userId,
  timestamp: Date.now(),
  device_model: deviceInfo.model,
  os_version: deviceInfo.system
})

// 2. 游戏结束
tt.reportAnalytics('game_over', {
  user_id: userId,
  score: finalScore,
  high_score: highScore,
  play_time: playTime,           // 游戏时长(秒)
  fruit_count: totalFruits,      // 投放水果总数
  max_fruit_level: maxLevel,     // 最高合成等级
  is_new_record: isNewRecord
})

// 3. 水果合成
tt.reportAnalytics('fruit_merge', {
  user_id: userId,
  from_level: fromLevel,
  to_level: toLevel,
  score_earned: scoreEarned
})

// 4. 使用道具 (V1.1)
tt.reportAnalytics('use_powerup', {
  user_id: userId,
  powerup_type: type,            // 'ball' | 'bomb'
  remaining_count: count
})

// 5. 分享 (V1.1)
tt.reportAnalytics('share', {
  user_id: userId,
  share_type: 'score',
  score: currentScore
})

// 6. 错误上报
tt.onError((error) => {
  tt.reportAnalytics('game_error', {
    error_message: error.message,
    error_stack: error.stack,
    page: currentPage
  })
})
```

---

### 7.3 数据看板

**每日核心指标看板**:
```
┌─────────────────────────────────────┐
│          合成水果数据看板            │
├─────────────────────────────────────┤
│ DAU           : 10,523  (↑ 5.2%)   │
│ 新增用户      : 1,234   (↑ 8.1%)   │
│ 次日留存      : 32.5%   (↓ 1.2%)   │
│ 7日留存       : 18.3%   (→ 0.0%)   │
├─────────────────────────────────────┤
│ 人均时长      : 8.5 分钟            │
│ 人均局数      : 5.2 局              │
│ 平均每局时长  : 1.6 分钟            │
├─────────────────────────────────────┤
│ 平均分数      : 125 分              │
│ 最高分        : 568 分              │
│ 分数中位数    : 98 分               │
└─────────────────────────────────────┘

8. 运营策略
8.1 冷启动策略
阶段一: 内测期 (Week 1-2)目标: 验证核心玩法，收集初步数据策略:

邀请 100-200 名种子用户内测
建立测试用户群收集反馈
快速迭代修复 Bug
优化核心体验
KPI:

完成率: 80%+ (完成至少 1 局游戏)
Bug 数量: < 5 个严重 Bug
用户满意度: 4.0+ 分 (5 分制)
阶段二: 小范围推广 (Week 3-4)目标: 扩大用户规模，验证留存数据策略:

在抖音小游戏中心上线
投放少量信息流广告
KOL 试玩视频（10-20 个中小 UP 主）
朋友圈/社群传播
KPI:

新增用户: 5,000+
次日留存: 25%+
人均时长: 6 分钟+
阶段三: 规模化推广 (Week 5-8)目标: 快速增长用户规模策略:

加大抖音信息流投放
头部 KOL 合作（10 万+ 粉丝）
挑战赛活动 (#合成水果挑战)
站内推荐位资源
限时活动（双倍积分周末）
KPI:

DAU: 50,000+
次日留存: 30%+
分享率: 5%+
8.2 用户增长策略拉新策略:

社交裂变:

分享到抖音可获得道具
邀请好友双方都获得奖励
好友排行榜刺激竞争



内容营销:

高分攻略教程
搞笑翻车视频
水果合成技巧分享



广告投放:

精准定位 18-35 岁休闲游戏用户
素材突出"解压"、"上瘾"卖点
A/B 测试不同创意


留存策略:

每日任务 (V1.2):

每日登录奖励
完成任务获得道具
连续签到递增奖励



社交功能 (V1.1):

好友排行榜
好友对战 (V2.0)
查看好友成绩



长期目标:

成就系统
等级体系
皮肤收集


促活策略:

限时活动:

周末双倍分数
节日特别版本（春节、中秋）
限定皮肤



推送通知:

好友超越你的分数
排行榜排名变化
新活动上线



游戏内引导:

提示今日任务未完成
提示有新道具可用
提示距离历史最高分差距


8.3 活动运营活动 1: 开服狂欢周

时间: 上线后第 1 周
内容:

每日登录送道具
达到指定分数送皮肤
排行榜前 100 名送称号


目标: 提升次日留存至 35%
活动 2: 周末挑战赛

时间: 每周六日
内容:

周末分数 x1.5
排行榜奖励加倍
限时道具折扣


目标: 提升周末活跃度 20%
活动 3: 好友对抗赛 (V1.1)

时间: 每月一次
内容:

邀请好友 1v1 对战
赢家获得特殊奖励
战绩可分享到抖音


目标: 提升分享率至 10%
8.4 用户分层运营新手用户 (0-3 天):

新手引导完成奖励
首周每日登录奖励
新手保护期（难度降低）
活跃用户 (7-30 天):

每日任务推荐
好友排行榜推送
限时活动通知
沉默用户 (30 天未登录):

推送召回通知
老用户回归礼包
好友邀请提醒
流失用户 (60 天未登录):

短信/邮件召回
超级福利礼包
新内容更新通知
9. 版本规划9.1 版本路线图V1.0 (MVP - Week 1-4)
│
├── 核心玩法
│   ├── 水果投放
│   ├── 水果合成
│   ├── 分数系统
│   └── 游戏结束
│
├── 基础 UI
│   ├── 游戏界面
│   ├── 结束面板
│   └── 重新开始
│
└── 基础音效

↓

V1.1 (社交版 - Week 5-8)
│
├── 社交功能
│   ├── 分享到抖音
│   ├── 好友排行榜
│   └── 成就系统
│
├── 道具系统
│   ├── 万能球
│   └── 炸弹
│
└── 视觉优化
    ├── 合成特效
    └── 动画优化

↓

V1.2 (运营版 - Week 9-12)
│
├── 每日任务
├── 签到系统
├── 活动系统
└── 推送通知

↓

V2.0 (商业化 - Week 13-20)
│
├── 皮肤系统
│   ├── 水果皮肤
│   ├── 背景主题
│   └── 音效包
│
├── 商城系统
│   ├── 道具购买
│   ├── 皮肤购买
│   └── 去广告会员
│
└── 多模式
    ├── 限时模式
    ├── 无尽模式
    └── 挑战模式9.2 V1.0 详细规划Sprint 1 (Week 1): 基础框架

 项目初始化
 屏幕适配系统
 资源加载系统
 游戏主循环
 触摸事件管理
Sprint 2 (Week 2): 核心玩法

 物理引擎集成
 水果投放功能
 碰撞检测
 水果合成逻辑
 分数系统
Sprint 3 (Week 3): UI 与交互

 游戏界面 UI
 游戏结束面板
 重新开始功能
 最高分存储
 音效集成
Sprint 4 (Week 4): 优化与测试

 性能优化
 Bug 修复
 内测用户测试
 数据埋点
 提交审核
9.3 迭代原则快速迭代:

每周发布一个小版本
每月发布一个大版本
灰度发布验证稳定性
数据驱动:

每个功能都要有数据指标
根据数据决定优化方向
A/B 测试验证效果
用户反馈:

建立用户反馈渠道
每周收集整理反馈
优先处理高频问题






# 技术方案

## 10. 技术架构

### 10.1 整体架构设计
```
┌─────────────────────────────────────────────────┐
│                   抖音小游戏平台                 │
│              (Runtime Environment)              │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│                  game.js (入口)                  │
│  ├── 初始化 Canvas                              │
│  ├── 加载资源                                    │
│  ├── 启动游戏循环                                │
│  └── 注册生命周期                                │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│                   表现层 (UI)                    │
│  ├── Scene (场景管理)                           │
│  ├── Component (UI 组件)                        │
│  └── Animation (动画系统)                        │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│                 业务逻辑层 (Core)                │
│  ├── GameState (状态机)                         │
│  ├── PhysicsEngine (物理引擎)                   │
│  ├── CollisionManager (碰撞管理)                │
│  ├── ScoreManager (分数管理)                    │
│  └── PowerUpManager (道具管理)                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│                 数据层 (Data)                    │
│  ├── Storage (本地存储)                         │
│  ├── Analytics (数据上报)                       │
│  └── Config (配置数据)                          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│                 工具层 (Utils)                   │
│  ├── Adapter (屏幕适配)                         │
│  ├── Pool (对象池)                              │
│  ├── ResourceLoader (资源加载)                  │
│  └── AudioManager (音频管理)                    │
└─────────────────────────────────────────────────┘
```

---

### 10.2 技术选型

| 技术点 | 方案选择 | 理由 |
|--------|---------|------|
| 平台 | 抖音小游戏 | 目标平台 |
| 语言 | JavaScript ES6+ | 平台支持，开发效率高 |
| 物理引擎 | Matter.js | 轻量级，API 简单，社区活跃 |
| 渲染 | Canvas 2D | 平台唯一选择，性能足够 |
| 状态管理 | 状态机模式 | 游戏状态清晰，易维护 |
| 构建工具 | 无需构建 | 小游戏平台直接运行 ES6 |
| 版本管理 | Git | 标准版本控制 |

---

### 10.3 目录结构设计
```
fruit-merge-game/
│
├── game.js                      # 入口文件
├── game.json                    # 游戏配置
├── project.config.json          # 项目配置
│
├── js/
│   │
│   ├── core/                    # 核心业务逻辑
│   │   ├── GameState.js         # 游戏状态机
│   │   ├── PhysicsEngine.js     # 物理引擎封装
│   │   ├── CollisionManager.js  # 碰撞管理
│   │   ├── ScoreManager.js      # 分数管理
│   │   └── PowerUpManager.js    # 道具管理 (V1.1)
│   │
│   ├── entity/                  # 游戏实体
│   │   ├── Fruit.js             # 水果实体
│   │   └── FruitFactory.js      # 水果工厂
│   │
│   ├── scene/                   # 场景管理
│   │   ├── BaseScene.js         # 场景基类
│   │   ├── MenuScene.js         # 菜单场景 (可选)
│   │   ├── PlayingScene.js      # 游戏场景
│   │   └── GameOverScene.js     # 结束场景
│   │
│   ├── ui/                      # UI 组件
│   │   ├── Button.js            # 按钮组件
│   │   ├── Panel.js             # 面板组件
│   │   ├── Text.js              # 文本组件
│   │   └── Sprite.js            # 精灵组件
│   │
│   ├── runtime/                 # 运行时系统
│   │   ├── GameLoop.js          # 游戏主循环
│   │   ├── ResourceLoader.js    # 资源加载器
│   │   └── Director.js          # 场景导演
│   │
│   ├── config/                  # 配置文件
│   │   ├── FruitConfig.js       # 水果配置
│   │   └── GameConfig.js        # 游戏配置
│   │
│   └── utils/                   # 工具类
│       ├── Adapter.js           # 屏幕适配
│       ├── Storage.js           # 存储封装
│       ├── Pool.js              # 对象池
│       ├── TouchManager.js      # 触摸管理
│       └── AudioManager.js      # 音频管理
│
├── libs/                        # 第三方库
│   └── matter.min.js            # Matter.js
│
├── images/                      # 图片资源
│   ├── fruits/                  # 水果图片
│   ├── ui/                      # UI 图片
│   └── effects/                 # 特效图片
│
└── audios/                      # 音频资源
    ├── drop.mp3
    ├── merge.mp3
    └── gameover.mp3
```

---

### 10.4 数据流设计
```
用户交互
    ↓
TouchManager (触摸管理)
    ↓
GameState (状态机判断)
    ↓
具体业务逻辑 (投放/合成/结束)
    ↓
PhysicsEngine (物理计算)
    ↓
CollisionManager (碰撞检测)
    ↓
ScoreManager (分数更新)
    ↓
Scene (场景渲染)
    ↓
Canvas 显示

11. 核心模块设计
11.1 游戏主循环 (GameLoop.js)
职责:

管理游戏帧循环
控制帧率
提供暂停/恢复接口

设计方案:
javascriptclass GameLoop {
  constructor(gameState) {
    this.gameState = gameState
    this.isRunning = false
    this.lastTime = 0
    this.targetFPS = 60
    this.frameInterval = 1000 / this.targetFPS
  }
  
  start() {
    this.isRunning = true
    this.lastTime = Date.now()
    this.loop()
  }
  
  loop() {
    if (!this.isRunning) return
    
    const currentTime = Date.now()
    const deltaTime = currentTime - this.lastTime
    
    if (deltaTime >= this.frameInterval) {
      // 更新游戏状态
      this.gameState.update(deltaTime)
      
      // 渲染画面
      this.gameState.render(this.gameState.ctx)
      
      this.lastTime = currentTime - (deltaTime % this.frameInterval)
    }
    
    requestAnimationFrame(() => this.loop())
  }
  
  pause() {
    this.isRunning = false
  }
  
  resume() {
    this.isRunning = true
    this.lastTime = Date.now()
    this.loop()
  }
}
性能优化:

使用 requestAnimationFrame 而非 setInterval
帧率限制避免过度渲染
deltaTime 计算确保匀速运行


11.2 物理引擎 (PhysicsEngine.js)
职责:

封装 Matter.js
创建物理世界
手动渲染所有物体

关键设计:
javascriptclass PhysicsEngine {
  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1 },
      enableSleeping: true
    })
    this.world = this.engine.world
    this.bodies = []
  }
  
  // 创建边界
  createBoundaries() {
    const width = Adapter.screenWidth
    const height = Adapter.screenHeight
    
    const ground = Matter.Bodies.rectangle(
      width / 2, 
      height - Adapter.px(20),
      width, 
      Adapter.px(40),
      { isStatic: true, label: 'ground' }
    )
    
    const leftWall = Matter.Bodies.rectangle(
      0, height / 2, Adapter.px(20), height,
      { isStatic: true, label: 'wall' }
    )
    
    const rightWall = Matter.Bodies.rectangle(
      width, height / 2, Adapter.px(20), height,
      { isStatic: true, label: 'wall' }
    )
    
    Matter.World.add(this.world, [ground, leftWall, rightWall])
  }
  
  // 更新物理世界
  update(deltaTime) {
    Matter.Engine.update(this.engine, deltaTime)
  }
  
  // 手动渲染（关键）
  render(ctx) {
    const bodies = Matter.Composite.allBodies(this.world)
    
    bodies.forEach(body => {
      if (body.label === 'wall') return
      
      ctx.save()
      ctx.translate(body.position.x, body.position.y)
      ctx.rotate(body.angle)
      
      // 绘制水果图片
      if (body.circleRadius && body.fruitType) {
        const config = FruitConfig.get(body.fruitType)
        const img = ResourceLoader.getImage(config.imageKey)
        const r = body.circleRadius
        
        ctx.drawImage(img, -r, -r, r * 2, r * 2)
      }
      
      ctx.restore()
    })
  }
  
  // 添加水果
  addFruit(fruit) {
    Matter.World.add(this.world, fruit.body)
    this.bodies.push(fruit)
  }
  
  // 移除水果
  removeFruit(fruit) {
    Matter.World.remove(this.world, fruit.body)
    const index = this.bodies.indexOf(fruit)
    if (index > -1) this.bodies.splice(index, 1)
  }
  
  // 清空所有
  clearAll() {
    this.bodies.forEach(fruit => {
      Matter.World.remove(this.world, fruit.body)
    })
    this.bodies = []
  }
}
注意事项:

Matter.js 默认渲染器不可用，必须手动渲染
每帧遍历所有 bodies 进行绘制
水果旋转需要使用 ctx.rotate()


11.3 碰撞管理 (CollisionManager.js)
职责:

监听碰撞事件
判断合成条件
执行合成逻辑

设计方案:
javascriptclass CollisionManager {
  constructor(physicsEngine, gameState) {
    this.physics = physicsEngine
    this.gameState = gameState
    this.mergeQueue = new Set()
    
    this.initCollisionEvents()
  }
  
  initCollisionEvents() {
    Matter.Events.on(this.physics.engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        this.handleCollision(pair.bodyA, pair.bodyB)
      })
    })
  }
  
  handleCollision(bodyA, bodyB) {
    // 检查是否都是水果
    if (!bodyA.fruitType || !bodyB.fruitType) return
    
    // 检查类型是否相同
    if (bodyA.fruitType !== bodyB.fruitType) return
    
    // 防重复合成
    const key = [bodyA.id, bodyB.id].sort().join('-')
    if (this.mergeQueue.has(key)) return
    
    this.mergeQueue.add(key)
    setTimeout(() => this.mergeQueue.delete(key), 100)
    
    // 执行合成
    this.merge(bodyA, bodyB)
  }
  
  merge(bodyA, bodyB) {
    const fruitType = bodyA.fruitType
    const config = FruitConfig.get(fruitType)
    
    // 获取下一级水果
    if (!config.nextId) return  // 已经是最高级
    
    // 计算合成位置
    const x = (bodyA.position.x + bodyB.position.x) / 2
    const y = (bodyA.position.y + bodyB.position.y) / 2
    
    // 移除旧水果
    const fruitA = this.physics.bodies.find(f => f.body === bodyA)
    const fruitB = this.physics.bodies.find(f => f.body === bodyB)
    this.physics.removeFruit(fruitA)
    this.physics.removeFruit(fruitB)
    
    // 创建新水果
    const newFruit = FruitFactory.create(config.nextId, x, y)
    this.physics.addFruit(newFruit)
    
    // 增加分数
    this.gameState.scoreManager.addScore(config.score)
    
    // 播放音效
    AudioManager.play('merge')
    
    // 播放特效
    this.playMergeEffect(x, y)
  }
  
  playMergeEffect(x, y) {
    // TODO: 粒子特效 (V1.1)
  }
}
防重复机制:

使用 Set 记录已处理的碰撞对
100ms 后自动清除记录
使用 body.id 的组合作为唯一键


11.4 状态机 (GameState.js)
职责:

管理游戏状态流转
统筹各子系统
处理用户交互

状态定义:
javascriptconst GAME_STATE = {
  MENU: 'menu',         // 菜单（可选）
  PLAYING: 'playing',   // 游戏中
  PAUSED: 'paused',     // 暂停（可选）
  GAMEOVER: 'gameover'  // 结束
}
```

**状态转换**:
```
MENU → PLAYING → GAMEOVER → PLAYING
核心实现:
javascriptclass GameState {
  constructor() {
    this.currentState = GAME_STATE.PLAYING
    
    // 初始化子系统
    this.physics = new PhysicsEngine()
    this.collisionManager = new CollisionManager(this.physics, this)
    this.scoreManager = new ScoreManager()
    
    // 游戏数据
    this.currentFruitType = this.getRandomFruitType()
    this.nextFruitType = this.getRandomFruitType()
    this.dropPosition = Adapter.screenWidth / 2
    this.canDrop = true
    
    // UI数据
    this.gameOverData = null
  }
  
  // 状态流转
  startGame() {
    this.currentState = GAME_STATE.PLAYING
    this.physics.clearAll()
    this.scoreManager.reset()
    this.currentFruitType = this.getRandomFruitType()
    this.nextFruitType = this.getRandomFruitType()
    this.canDrop = true
  }
  
  gameOver() {
    this.currentState = GAME_STATE.GAMEOVER
    
    // 保存最高分
    const score = this.scoreManager.getScore()
    const highScore = Storage.getHighScore()
    if (score > highScore) {
      Storage.saveHighScore(score)
    }
    
    // 准备结束面板数据
    this.gameOverData = {
      score,
      highScore: Math.max(score, highScore),
      isNewRecord: score > highScore
    }
    
    // 播放音效
    AudioManager.play('gameover')
    
    // 数据上报
    this.reportGameData()
  }
  
  // 每帧更新
  update(deltaTime) {
    if (this.currentState === GAME_STATE.PLAYING) {
      this.physics.update(deltaTime)
      this.checkGameOver()
    }
  }
  
  // 每帧渲染
  render(ctx) {
    ctx.clearRect(0, 0, Adapter.screenWidth, Adapter.screenHeight)
    
    this.renderBackground(ctx)
    
    if (this.currentState === GAME_STATE.PLAYING) {
      this.renderPlayingScene(ctx)
    } else if (this.currentState === GAME_STATE.GAMEOVER) {
      this.renderGameOverScene(ctx)
    }
  }
  
  renderPlayingScene(ctx) {
    // 1. 绘制警戒线
    this.renderWarningLine(ctx)
    
    // 2. 绘制辅助线
    this.renderGuideLine(ctx)
    
    // 3. 绘制当前水果预览
    this.renderCurrentFruitPreview(ctx)
    
    // 4. 绘制物理世界
    this.physics.render(ctx)
    
    // 5. 绘制分数
    this.renderScore(ctx)
    
    // 6. 绘制下一个水果
    this.renderNextFruit(ctx)
  }
  
  renderGameOverScene(ctx) {
    // 1. 绘制游戏场景（背景）
    this.physics.render(ctx)
    
    // 2. 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, Adapter.screenWidth, Adapter.screenHeight)
    
    // 3. 结束面板
    this.renderGameOverPanel(ctx)
  }
  
  renderGameOverPanel(ctx) {
    const width = Adapter.screenWidth
    const height = Adapter.screenHeight
    
    const panelW = width * 0.8
    const panelH = height * 0.4
    const panelX = (width - panelW) / 2
    const panelY = (height - panelH) / 2
    
    // 面板背景
    ctx.fillStyle = '#FFFFFF'
    this.roundRect(ctx, panelX, panelY, panelW, panelH, Adapter.px(20))
    ctx.fill()
    
    // 标题
    ctx.fillStyle = '#333333'
    ctx.font = `bold ${Adapter.px(50)}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText('游戏结束', width / 2, panelY + Adapter.px(80))
    
    // 本次得分
    ctx.font = `${Adapter.px(36)}px Arial`
    ctx.fillStyle = '#666666'
    ctx.fillText('本次得分', width / 2, panelY + Adapter.px(150))
    
    ctx.font = `bold ${Adapter.px(60)}px Arial`
    ctx.fillStyle = '#FF6B6B'
    ctx.fillText(this.gameOverData.score, width / 2, panelY + Adapter.px(220))
    
    // 历史最高
    ctx.font = `${Adapter.px(32)}px Arial`
    ctx.fillStyle = '#999999'
    ctx.fillText(`历史最高: ${this.gameOverData.highScore}`, width / 2, panelY + Adapter.px(280))
    
    // 新纪录
    if (this.gameOverData.isNewRecord) {
      ctx.fillStyle = '#FFD700'
      ctx.font = `bold ${Adapter.px(32)}px Arial`
      ctx.fillText('🎉 新纪录！', width / 2, panelY + Adapter.px(320))
    }
    
    // 重新开始按钮
    this.render
    









# 抖音小游戏《合成水果》完整开发规格文档 (仅供参考)
1. Project Overview
1.1 项目定位
基于抖音小游戏平台开发的休闲益智类游戏，玩家通过投放水果使相同水果碰撞合成更大水果获得分数。
1.2 Tech Stack

平台: 抖音小游戏 (字节跳动小游戏引擎)
核心引擎:

抖音小游戏 API (tt.*)
Canvas 2D 渲染
Matter.js 物理引擎 (需适配小游戏环境)


开发语言: JavaScript ES6+
开发工具: 抖音开发者工具
包管理: npm

1.3 抖音小游戏平台特性分析
核心差异:

无 window/document 对象，全局对象为 tt
Canvas 通过 tt.createCanvas() 创建
不支持 DOM 操作，纯 Canvas 渲染
需要手动实现所有 UI 组件
Matter.js 的默认渲染器不可用，需自行实现渲染逻辑

关键 API:

Canvas: tt.createCanvas() - 创建绘图画布
生命周期: tt.onShow(), tt.onHide(), tt.onError()
存储: tt.setStorage(), tt.getStorage(), tt.setStorageSync(), tt.getStorageSync()
系统信息: tt.getSystemInfoSync() - 获取屏幕尺寸、设备信息
图片: tt.createImage() - 加载图片资源
音频: tt.createInnerAudioContext() - 创建音频对象
弹窗: tt.showModal(), tt.showLoading(), tt.hideLoading()
数据上报: tt.reportAnalytics() - 统计埋点


2. Project Structure
fruit-merge-game/
├── game.js                    # 【必需】入口文件
├── game.json                  # 【必需】游戏配置
├── project.config.json        # 【必需】项目配置
│
├── js/
│   ├── runtime/
│   │   ├── GameLoop.js       # 游戏主循环(RAF)
│   │   ├── ResourceLoader.js # 资源预加载器
│   │   └── Director.js       # 场景导演(管理场景切换)
│   │
│   ├── core/
│   │   ├── PhysicsEngine.js  # Matter.js封装+手动渲染
│   │   ├── CollisionManager.js # 碰撞检测与合成逻辑
│   │   ├── ScoreManager.js   # 分数计算与管理
│   │   └── GameState.js      # 游戏状态机
│   │
│   ├── entity/
│   │   ├── Fruit.js          # 水果实体类
│   │   └── FruitFactory.js   # 水果工厂(创建/配置)
│   │
│   ├── scene/
│   │   ├── BaseScene.js      # 场景基类
│   │   ├── MenuScene.js      # 菜单场景
│   │   ├── PlayingScene.js   # 游戏场景
│   │   └── GameOverScene.js  # 结束场景
│   │
│   ├── ui/
│   │   ├── Button.js         # 按钮组件(支持点击检测)
│   │   ├── Panel.js          # 面板组件
│   │   ├── Text.js           # 文字渲染组件
│   │   └── Sprite.js         # 精灵类(图片渲染)
│   │
│   ├── config/
│   │   ├── FruitConfig.js    # 水果等级配置
│   │   └── GameConfig.js     # 全局游戏配置
│   │
│   └── utils/
│       ├── Adapter.js        # 屏幕适配工具
│       ├── Storage.js        # 存储封装
│       ├── TouchManager.js   # 触摸事件管理
│       └── Pool.js           # 对象池(性能优化)
│
├── libs/
│   └── matter.min.js         # Matter.js库
│
├── images/                    # 图片资源(<4MB)
│   ├── fruits/
│   │   ├── cherry.png        # 樱桃
│   │   ├── tomato.png        # 番茄
│   │   ├── lemon.png         # 柠檬
│   │   ├── coconut.png       # 椰子
│   │   ├── kiwi.png          # 猕猴桃
│   │   ├── peach.png         # 桃子
│   │   ├── lemon-slice.png   # 柠檬片
│   │   ├── orange-slice.png  # 橙子片
│   │   └── watermelon.png    # 西瓜
│   ├── ui/
│   │   ├── bg.png            # 背景图
│   │   ├── btn-restart.png   # 重新开始按钮
│   │   ├── btn-start.png     # 开始游戏按钮
│   │   ├── panel-gameover.png # 结束面板背景
│   │   ├── icon-bomb.png     # 炸弹道具
│   │   └── icon-ball.png     # 万能球道具
│   └── effects/
│       └── particle.png      # 合成特效粒子
│
└── audios/                    # 音效资源
    ├── drop.mp3              # 投放音效
    ├── merge.mp3             # 合成音效
    ├── gameover.mp3          # 游戏结束音效
    └── bgm.mp3               # 背景音乐(可选)
```

---

## 3. Core Architecture Design

### 3.1 游戏入口 (game.js)

**职责**:
- 作为抖音小游戏的唯一入口文件
- 初始化 Canvas 和全局上下文
- 加载所有资源
- 启动游戏主循环
- 注册抖音生命周期事件
- 注册触摸事件监听

**核心流程**:
```
1. 获取设备信息 (tt.getSystemInfoSync)
2. 创建 Canvas (tt.createCanvas)
3. 初始化屏幕适配 (Adapter.init)
4. 显示加载提示 (tt.showLoading)
5. 预加载所有资源 (ResourceLoader.loadAll)
6. 隐藏加载提示 (tt.hideLoading)
7. 初始化场景管理器 (Director)
8. 启动游戏循环 (GameLoop.start)
9. 注册生命周期回调 (tt.onShow/onHide/onError)
10. 注册触摸事件 (canvas.addEventListener)
关键代码结构:
javascriptclass Main {
  constructor() {
    this.canvas = tt.createCanvas()
    this.ctx = this.canvas.getContext('2d')
    this.init()
  }
  
  async init() {
    // 适配屏幕
    // 加载资源
    // 初始化游戏
    // 启动循环
    // 注册事件
  }
  
  registerLifeCycle() {
    // tt.onShow/onHide/onError
  }
  
  registerTouch() {
    // touchstart/touchmove/touchend
  }
}

new Main()

3.2 配置文件
game.json
json{
  "deviceOrientation": "portrait",
  "showStatusBar": false,
  "networkTimeout": {
    "request": 10000,
    "downloadFile": 10000
  }
}
project.config.json
json{
  "miniprogramRoot": "./",
  "setting": {
    "es6": true,
    "minified": true
  },
  "appid": "your_app_id",
  "projectname": "fruit-merge-game"
}

4. Core Systems
4.1 屏幕适配系统 (Adapter.js)
职责:

适配不同屏幕尺寸和分辨率
提供设计稿坐标到实际坐标的转换
处理刘海屏安全区域

设计方案:

设计稿基准: 750x1334 (iPhone 6/7/8)
缩放策略: 等比缩放 (scale = screenWidth / 750)
提供 px(value) 方法转换坐标

核心方法:
javascriptAdapter.init()              // 初始化适配
Adapter.px(value)           // 设计稿像素转实际像素
Adapter.screenWidth         // 屏幕宽度
Adapter.screenHeight        // 屏幕高度
Adapter.scale               // 缩放比例
Adapter.getSafeArea()       // 获取安全区域

4.2 资源加载系统 (ResourceLoader.js)
职责:

预加载所有图片和音频资源
提供资源访问接口
处理加载失败情况

加载流程:

定义资源清单 (imageList, audioList)
使用 tt.createImage() 加载图片
使用 tt.createInnerAudioContext() 加载音频
Promise.all 并行加载
存储到静态 Map 中

核心方法:
javascriptResourceLoader.loadAll()         // 加载所有资源
ResourceLoader.getImage(key)     // 获取图片对象
ResourceLoader.playAudio(key)    // 播放音效
资源清单示例:
javascriptimageList = [
  { key: 'cherry', src: 'images/fruits/cherry.png' },
  { key: 'tomato', src: 'images/fruits/tomato.png' },
  ...
]

4.3 存储系统 (Storage.js)
职责:

封装抖音小游戏存储 API
管理最高分数据持久化
提供同步和异步接口

核心方法:
javascriptStorage.saveHighScore(score)      // 同步保存最高分
Storage.getHighScore()            // 同步获取最高分
Storage.saveHighScoreAsync(score) // 异步保存
Storage.getHighScoreAsync()       // 异步获取
使用 API:

tt.setStorageSync() / tt.getStorageSync() - 同步
tt.setStorage() / tt.getStorage() - 异步


4.4 物理引擎系统 (PhysicsEngine.js)
职责:

封装 Matter.js 物理引擎
创建物理世界和边界
手动渲染所有物体 (Matter.js 默认渲染器不可用)
管理水果物体的添加/移除

关键设计:

禁用 Matter.Render: 抖音小游戏不支持
手动遍历渲染: 每帧遍历 world.bodies 自行绘制
边界创建: 地面 + 左右墙壁 (isStatic: true)
重力设置: { x: 0, y: 1 } 模拟自然重力

核心方法:
javascriptPhysicsEngine.init()                    // 初始化引擎
PhysicsEngine.createBoundaries()        // 创建边界
PhysicsEngine.update(deltaTime)         // 更新物理世界
PhysicsEngine.render(ctx)               // 手动渲染所有物体
PhysicsEngine.addFruit(fruit)           // 添加水果到世界
PhysicsEngine.removeFruit(fruit)        // 移除水果
PhysicsEngine.clearAll()                // 清空所有水果
手动渲染逻辑:
javascriptrender(ctx) {
  const bodies = Matter.Composite.allBodies(this.world)
  bodies.forEach(body => {
    ctx.save()
    ctx.translate(body.position.x, body.position.y)
    ctx.rotate(body.angle)
    // 绘制水果图片或圆形
    ctx.restore()
  })
}

4.5 碰撞管理系统 (CollisionManager.js)
职责:

监听 Matter.js 碰撞事件
识别相同水果碰撞
执行水果合成逻辑
触发分数增加和音效

核心逻辑:

监听 Matter.Events.on(engine, 'collisionStart')
检查碰撞的两个物体是否都是水果
判断水果类型是否相同
相同则移除旧水果，创建新水果
计算合成位置 (两个水果中点)
增加分数
播放合成音效

防重复合成:

使用 Set 记录已处理的碰撞对
设置短暂延迟后清除记录

核心方法:
javascriptCollisionManager.init()                    // 初始化监听
CollisionManager.update()                  // 每帧更新
CollisionManager.onCollision(pair)         // 碰撞回调
CollisionManager.mergeFruits(a, b, type)   // 合成水果

4.6 分数管理系统 (ScoreManager.js)
职责:

管理当前分数
计算合成得分
对比和更新最高分

分数规则:

不同水果合成得分不同
高级水果得分更高
可设置连击加成 (可选)

核心方法:
javascriptScoreManager.reset()              // 重置为0
ScoreManager.addScore(points)     // 增加分数
ScoreManager.getScore()           // 获取当前分数
ScoreManager.getHighScore()       // 获取历史最高分
ScoreManager.updateHighScore()    // 更新最高分
```

---

### 4.7 游戏状态机 (GameState.js)

**职责**:
- 管理游戏状态流转
- 控制场景切换
- 统筹所有子系统

**状态定义**:
```
menu      -> 菜单场景 (开始游戏按钮)
playing   -> 游戏进行中
paused    -> 暂停 (可选)
gameover  -> 游戏结束
核心数据:
javascript{
  currentScene: 'menu',              // 当前场景
  score: 0,                          // 当前分数
  highScore: 0,                      // 历史最高分
  currentFruitType: 1,               // 当前要投放的水果类型
  nextFruitType: 2,                  // 下一个水果类型
  dropPosition: screenWidth / 2,     // 投放位置X
  canDrop: true,                     // 是否可以投放
  gameOverData: null                 // 结束面板数据
}
核心方法:
javascriptGameState.startGame()                  // 开始游戏
GameState.updateDropPosition(x)        // 更新投放位置
GameState.dropFruit()                  // 投放水果
GameState.checkGameOver()              // 检查结束条件
GameState.gameOver()                   // 触发游戏结束
GameState.restart()                    // 重新开始
GameState.update(deltaTime)            // 每帧更新
GameState.render(ctx)                  // 每帧渲染
游戏结束判定:

检测是否有水果超出警戒线 (屏幕顶部下方 200px)
且该水果处于静止状态 (velocity.y ≈ 0)
延迟 1 秒检测避免误判


5. Entity System
5.1 水果配置 (FruitConfig.js)
水果等级系统:
javascriptFRUITS = [
  { 
    id: 1, 
    name: '樱桃', 
    imageKey: 'cherry',
    radius: 32,           // 半径(设计稿像素)
    score: 1,             // 合成得分
    nextId: 2,            // 下一级水果ID
    mass: 0.5,            // 质量
    color: '#FF6B6B'      // 备用颜色
  },
  { id: 2, name: '番茄', imageKey: 'tomato', radius: 45, score: 3, nextId: 3, mass: 1, color: '#FF8787' },
  { id: 3, name: '柠檬', imageKey: 'lemon', radius: 58, score: 6, nextId: 4, mass: 1.5, color: '#FFD93D' },
  { id: 4, name: '椰子', imageKey: 'coconut', radius: 75, score: 10, nextId: 5, mass: 2.5, color: '#FFFFFF' },
  { id: 5, name: '猕猴桃', imageKey: 'kiwi', radius: 65, score: 15, nextId: 6, mass: 2, color: '#6BCB77' },
  { id: 6, name: '桃子', imageKey: 'peach', radius: 90, score: 21, nextId: 7, mass: 3, color: '#FFB84D' },
  { id: 7, name: '柠檬片', imageKey: 'lemon-slice', radius: 38, score: 28, nextId: 8, mass: 0.8, color: '#FFF176' },
  { id: 8, name: '橙子片', imageKey: 'orange-slice', radius: 45, score: 36, nextId: 9, mass: 1, color: '#FFA726' },
  { id: 9, name: '西瓜', imageKey: 'watermelon', radius: 120, score: 45, nextId: null, mass: 4, color: '#FF6F91' }
]
投放规则:

只能投放前 5 种基础水果 (id: 1-5)
随机生成


5.2 水果工厂 (FruitFactory.js)
职责:

根据配置创建 Matter.js Body
附加渲染信息
提供随机生成方法

核心方法:
javascriptFruitFactory.createFruit(type, x, y)  // 创建水果物体
FruitFactory.getConfig(type)          // 获取水果配置
FruitFactory.getRandomBasicType()     // 随机基础水果类型
FruitFactory.getRadius(type)          // 获取水果半径
创建逻辑:
javascriptcreateFruit(type, x, y) {
  const config = this.getConfig(type)
  const body = Matter.Bodies.circle(
    x, y, 
    Adapter.px(config.radius),
    {
      restitution: 0.3,    // 弹性
      friction: 0.5,       // 摩擦
      density: config.mass,
      label: `fruit-${type}`,
      render: {
        sprite: {
          texture: config.imageKey,
          xScale: 1,
          yScale: 1
        }
      }
    }
  )
  return { type, body, config }
}

6. Scene System
6.1 场景架构
设计模式: 状态模式 + 策略模式
基类 (BaseScene.js):
javascriptclass BaseScene {
  init()          // 场景初始化
  update(dt)      // 每帧更新
  render(ctx)     // 每帧渲染
  onEnter()       // 进入场景
  onExit()        // 退出场景
  handleTouch(e)  // 处理触摸
}

6.2 游戏场景 (PlayingScene.js)
渲染内容:

背景: 黄色温暖色调或背景图
警戒线: 红色虚线 (y = 200px)
投放辅助线: 白色虚线 (跟随触摸位置)
当前水果预览: 顶部显示将要投放的水果
下一个水果预览: 右上角小图标
分数显示: 左上角大号黄色数字
物理世界渲染: 所有已投放的水果
地面: 木质纹理矩形

交互逻辑:

touchmove: 更新投放位置和辅助线
touchend: 在投放位置创建水果
投放冷却: 500ms 防止连续投放


6.3 游戏结束场景 (GameOverScene.js)
渲染内容:

半透明遮罩: 覆盖整个屏幕 rgba(0,0,0,0.6)
结束面板: 白色圆角矩形居中显示

标题: "游戏结束"
本次得分: 大号红色数字
历史最高分: 小号灰色文字
新纪录标识: 金色文字+emoji (条件显示)


重新开始按钮: 绿色圆角按钮

文字: "重新开始"
位置: 面板底部居中



面板数据:
javascript{
  x, y, width, height,        // 面板位置尺寸
  currentScore,               // 本次分数
  highScore,                  // 历史最高
  isNewRecord                 // 是否新纪录
}
按钮数据:
javascript{
  x, y, width, height,        // 按钮区域
  text: '重新开始',
  color: '#4CAF50'
}
交互逻辑:

touchend: 检测触摸点是否在按钮区域内
在按钮内则调用 GameState.restart()

点击检测算法:
javascriptisInside(touchX, touchY, rect) {
  return touchX >= rect.x && 
         touchX <= rect.x + rect.width &&
         touchY >= rect.y && 
         touchY <= rect.y + rect.height
}

7. UI Components
7.1 按钮组件 (Button.js)
属性:
javascript{
  x, y, width, height,
  text,                  // 按钮文字
  bgColor,               // 背景颜色
  textColor,             // 文字颜色
  fontSize,              // 字体大小
  borderRadius,          // 圆角半径
  onClick                // 点击回调
}
方法:
javascriptButton.render(ctx)              // 渲染按钮
Button.handleTouch(x, y)        // 处理触摸
Button.isInside(x, y)           // 点击检测

7.2 文本组件 (Text.js)
功能:

支持多行文本
自动换行
对齐方式 (left/center/right)
阴影效果

属性:
javascript{
  x, y,
  text,
  fontSize,
  color,
  align,
  maxWidth,              // 最大宽度(换行)
  lineHeight             // 行高
}

7.3 面板组件 (Panel.js)
功能:

圆角矩形背景
阴影效果
子组件容器

属性:
javascript{
  x, y, width, height,
  bgColor,
  borderRadius,
  shadow,
  children               // 子组件数组
}

8. Game Features
8.1 道具系统 (可选扩展)
万能球:

可与任意水果合成
生成对应水果的下一级水果
使用次数限制 (如 3 次)

炸弹:

消除点击位置周围一定范围内的所有水果
不增加分数
使用次数限制 (如 3 次)

实现方案:
javascriptPowerUpManager.useBall(x, y)       // 使用万能球
PowerUpManager.useBomb(x, y)       // 使用炸弹
PowerUpManager.getCount(type)      // 获取剩余次数

8.2 特效系统 (可选)
合成特效:

粒子爆炸效果
使用对象池优化性能

音效:

投放音效: drop.mp3
合成音效: merge.mp3
游戏结束: gameover.mp3
背景音乐: bgm.mp3 (可选)


8.3 性能优化
对象池 (Pool.js):

复用水果对象
复用粒子对象
减少 GC 压力

渲染优化:

离屏渲染 (OffscreenCanvas)
脏矩形更新
降低分辨率 (retina 屏适配)

物理优化:

限制最大水果数量 (50个)
休眠机制 (Matter.sleeping)
降低物理更新频率


9. Development Workflow
9.1 开发环境搭建
步骤:

下载并安装 抖音开发者工具
注册抖音小游戏账号，获取 AppID
使用开发者工具创建项目
配置 project.config.json


9.2 开发流程
Phase 1 (Week 1): 基础框架

✅ 搭建项目结构
✅ 实现屏幕适配
✅ 实现资源加载
✅ 实现游戏循环

Phase 2 (Week 2): 核心玩法

✅ 集成 Matter.js 并实现手动渲染
✅ 实现水果投放
✅ 实现碰撞检测与合成
✅ 实现分数系统

Phase 3 (Week 3): UI 与交互

✅ 实现游戏结束面板
✅ 实现重新开始功能
✅ 实现最高分存储
✅ 优化触摸体验

Phase 4 (Week 4): 优化与上线

✅ 性能优化
✅ 音效集成
✅ 数据埋点
✅ 提交审核


9.3 调试技巧
日志输出:
javascriptconsole.log('Debug info')
真机调试:

使用抖音开发者工具的真机调试功能
扫码在手机抖音中测试

性能监控:
javascriptconst fps = 1000 / deltaTime
console.log('FPS:', fps)

10. Project Conventions
10.1 Code Style

命名规范:

类名: PascalCase (PhysicsEngine)
函数/变量: camelCase (createFruit)
常量: UPPER_SNAKE_CASE (MAX_FRUITS)
私有方法: 前缀 _ (_handleCollision)


文件命名:

类文件: PascalCase.js
工具文件: camelCase

《合成水果》抖音小游戏 - 产品需求文档 (PRD) + 技术方案

目录
Part A: 产品需求文档 (PRD)

产品概述
用户分析
产品目标
功能需求
交互设计
视觉设计
数据指标
运营策略
版本规划

Part B: 技术方案

技术架构
核心模块设计
性能优化方案
质量保障
部署方案
风险控制
