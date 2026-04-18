# UI 全面改版 + 玩家选择系统 Design Spec

## Goal

将 lifeRestart 的全站 UI 从深色主题改为浅色现代风格，同时引入玩家主动抉择系统：6 个人生关键节点、条件概率赌博机制、蝴蝶效应可视化、局间成长 buff、濒死危机机制，将游戏从"被动观看"升级为"有真实重量的人生决策"。

## Feature Scope

### Part 1: UI 全面改版

- 所有页面切换为浅色主题（白底 + 命运紫主色 #6366f1）
- 五维属性统一彩色徽章展示（粉/蓝/绿/黄/紫各对应一维）
- 天赋卡按 grade 颜色区分（SSSS=金、S=紫、A=靛、B=灰）
- 事件按 grade 有左边框颜色和背景色
- 轨迹页底部常驻年龄 + 人生阶段指示器
- 抉择事件内嵌在时间流中（不是覆盖弹窗）

### Part 2: 玩家选择系统

- 6 个人生节点（18/22/30/40/55/70岁），每局 4–8 个可用选项（因属性条件动态显示）
- **每个选项都有明确代价**，不存在无成本最优解
- **条件概率机制**：创业等赌博选项的成功率由玩家前期积累决定，而非纯50/50
- **蝴蝶效应文本**：触发节点时显示前序决定的影响
- **封锁路线可视化**：选项旁显示 "⚠️ 将永久封锁：XXX" 警告
- 带锁选项（🔒）：不满足条件时对玩家完全不可见
- **低属性专属路线**：INT≤4 可见"技校"选项，解锁完整手艺人叙事线

### Part 3: 局间成长（跨局 buff）

- 每局结束按总评等级在 localStorage 解锁一条永久 buff（如"书香门第：初始 INT+1"）
- 下局 startTrajectory() 时叠加到初始属性
- 最多累积 5 条 buff，达到上限后新 buff 替换最旧的

### Part 4: 濒死危机机制

- 任意核心属性（CHR/INT/STR/MNY/SPR）降至 0 时，当回合触发一次性 CRISIS 节点
- 给玩家一个高风险高回报的博弈机会，成功则属性回血，失败则加速死亡
- 每局只触发一次

## 视觉系统

### 色板

| 用途 | 颜色 |
|------|------|
| 页面背景 | `#ffffff` |
| 卡片背景 | `#f1f5f9` |
| 主色调（命运紫） | `#6366f1` |
| 主文字 | `#1e293b` |
| 次文字 | `#94a3b8` |
| 边框 | `#e2e8f0` |
| 危险色 | `#f43f5e` |

### 属性颜色映射

| 属性 | 背景色 | 文字色 | Emoji |
|------|--------|--------|-------|
| 颜值 CHR | `#fce7f3` | `#9d174d` | 💎 |
| 智力 INT | `#dbeafe` | `#1e40af` | 🧠 |
| 体质 STR | `#d1fae5` | `#065f46` | 💪 |
| 家境 MNY | `#fef3c7` | `#92400e` | 💰 |
| 心态 SPR | `#ede9fe` | `#5b21b6` | ✨ |

### 事件等级样式

| Grade | 左边框色 | 背景色 | 说明 |
|-------|----------|--------|------|
| SSSS | `#f59e0b` | `#fff7ed` | 人生高光，金色 |
| SSS / SS | `#a855f7` | `#faf5ff` | 传奇，紫色 |
| S / A | `#7c3aed` | `#f5f3ff` | 厉害，深紫 |
| B / C | `#94a3b8` | `#f8fafc` | 普通，灰色 |
| 地狱（负面） | `#f43f5e` | `#fff1f2` | 低谷，红色 |

天赋条目（TLT 类型）用更小的 pill 样式，不占主要视觉权重。

## 页面设计

### HomePage

- 白底，大标题"人生重开模拟器"居中
- 副标题（运行次数 / 总成就 / 已解锁 buff 数量）
- "开始新的人生"按钮（命运紫）

### SetupPage（天赋 + 属性两步）

**天赋选择：**
- 天赋卡按 grade 背景色区分（见上方颜色映射）
- 右上角 grade 徽章
- 已选状态：边框变为 `#6366f1`，右上角出现 ✓

**属性分配：**
- 每维属性用彩色进度条（颜色同属性映射）
- 顶部显示剩余点数
- 若有局间 buff，显示 "+1（传承加成）" 灰色小字
- "随机" + "开始人生"按钮

### PlayPage（轨迹页）

- 事件列表：每条事件为圆角卡片，按 grade 展示左边框 + 背景色
- 年龄分隔线：`── X岁 ──` 灰色居中
- **常驻底部栏**：`🕐 X岁 · [人生阶段]` + "下一年"按钮
- 人生阶段映射：0-12 幼年、13-17 少年、18-29 青年、30-49 中年、50-64 壮年、65+ 老年
- 抉择节点内嵌：见下方选择系统组件

### SummaryPage（总评页）

- 顶部：享年大字 + 总评等级（命运紫）
- 属性网格：3列×2行，SUM 总评单独占一格（渐变背景，强调）
- 天赋标签：pill 样式，横向排列
- 已解锁本局 buff（若有）：绿色 pill 显示"已解锁：书香门第"
- 底部按钮："分享海报"（ghost）+ "再来一次"（命运紫）

## 选择系统组件

### ChoiceCard（内嵌在轨迹流）

```ts
type MilestoneKey = 'GAOKAO' | 'GRADUATION' | 'MARRIAGE' | 'MIDLIFE' | 'RETIREMENT' | 'TWILIGHT' | 'CRISIS'

interface ChoiceCardProps {
  milestone: MilestoneKey
  age: number
  options: ChoiceOption[]          // 经过条件过滤后的可用选项
  butterflyContext?: string         // 蝴蝶效应文本，如"因为18岁选择打工，你比同龄人早攒了2点家境"
  onSelect: (optionId: string) => void
}

interface ChoiceOption {
  id: string
  label: string
  emoji: string
  effects: Partial<Record<'CHR'|'INT'|'STR'|'MNY'|'SPR', number>>
  successRate?: number              // 0-100，有此字段则显示概率（条件概率赌博选项）
  unlockTag?: string
  blockTag?: string
  blockTagLabel?: string            // blockTag 的可读文案，如"大学生活"
  hint: string
}
```

**布局：**
- 顶部：`⚡ 人生抉择 · X岁` 标题行（命运紫）
- 若有 `butterflyContext`：浅灰背景小字显示蝴蝶效应文本
- 事件描述文字
- 选项列表：每个选项为白底圆角卡片
  - 左侧：emoji + 文字
  - 右侧：效果提示（绿色正效果 / 红色负效果）
  - 若有 `successRate`：显示 "成功率 XX%" 蓝色小字
  - 若有 `blockTagLabel`：显示 `⚠️ 将封锁：[blockTagLabel]` 红色小字
- 选中后：选中项变为命运紫背景，其余选项淡出，显示"你选择了：XXX"
- 选完后只读，不可再改

### MilestoneConfig（数据层）

```ts
interface MilestoneConfig {
  key: MilestoneKey
  age: number
  triggerCondition?: (state: GameState) => boolean  // undefined = 必定触发
  description: string
  butterflyContextFn?: (choiceHistory: ChoiceHistoryEntry[]) => string | undefined
  options: Array<ChoiceOption & { requireCondition?: (props: PropertySnapshot) => boolean }>
}
```

**条件概率计算：**`successRate` 由 `computeSuccessRate(option, props, choiceHistory)` 运行时计算，结果注入 `ChoiceOption.successRate`，渲染前计算，不存入 store。

## 六个节点完整配置

### GAOKAO · 18岁 · 高考（必定触发）

| 选项 | 条件 | 效果 | 代价 |
|------|------|------|------|
| 技校 | INT≤4（专属，仅低智力可见） | MNY+1, CHR+1，解锁 tag:craftsman | 封锁 tag:college_life，封锁精英职场 |
| 复读 | 无 | INT+1，下一年再触发 GAOKAO（最多2次） | 一年时间损耗 |
| 普通大学 | 无 | SPR+1 | 无显著加成 |
| 名校 | INT≥7 | INT+2，解锁 tag:elite_career | CHR-1（人际退化） |
| 出国留学 | MNY≥7 | INT+1，解锁 tag:overseas | MNY-3，封锁 tag:local_network |
| 直接打工 | 无 | MNY+2，解锁 tag:early_career | INT-1，封锁 tag:college_life |

### GRADUATION · 22岁 · 毕业去向

**触发条件：** tag:college_life 在 eventTags 中（即未被封锁）。若 18岁选了考研则推迟至 24岁。

`college_life` tag 初始存在于 eventTags；GAOKAO 选项"技校"或"直接打工"将其移除。

| 选项 | 条件 | 效果 | 代价 |
|------|------|------|------|
| 大厂打工 | INT≥5 | MNY+2 | SPR-1, STR-1（996 内耗） |
| 创业 | MNY≥5 | **条件概率**（见下方）| 见下方 |
| 考研 | INT≥6 | INT+2，GRADUATION 推迟至 24岁 | MNY-1，时间损耗 |
| 自由职业 | 无 | SPR+2, MNY+1 | 封锁 tag:corporate |

**创业成功率计算：**
- 基础成功率 30%
- INT≥6：+20%
- CHR≥6：+20%
- choiceHistory 中有 `graduation.dachangdagong`：+20%（有大厂经验）
- 成功：MNY+4，解锁 tag:entrepreneur
- 失败：MNY-3，SPR-2

### MARRIAGE · 30岁 · 婚姻（60% 概率触发）

| 选项 | 条件 | 效果 | 代价 |
|------|------|------|------|
| 结婚 | CHR≥5 | SPR+2 | MNY-1 |
| 闪婚 | CHR≥8 | **条件概率**（CHR 越高成功率越高） | 失败：SPR-3, MNY-1 |
| 单身主义 | 无 | MNY+1 | SPR-1，封锁 tag:family（晚年无家庭） |

**闪婚成功率：** `50 + (CHR - 8) * 15`（CHR=8→50%，CHR=10→80%）
- 成功：SPR+3
- 失败：SPR-3, MNY-1

### MIDLIFE · 40岁 · 中年危机（必定触发）

| 选项 | 条件 | 效果 | 代价 |
|------|------|------|------|
| 继续拼搏 | 无 | MNY+2 | SPR-2, STR-1 |
| 躺平享受 | 无 | SPR+3 | MNY-1 |
| 转型创业 | MNY≥6 | **条件概率**（见下方） | 失败：MNY-4 |

**转型创业成功率：**
- 基础 40%（比年轻时高，有阅历）
- choiceHistory 中有创业经验（graduation 或 midlife 上一次）：+20%
- 成功：MNY+4，解锁 tag:late_entrepreneur

### RETIREMENT · 55岁 · 退休规划（必定触发）

| 选项 | 条件 | 效果 | 代价 |
|------|------|------|------|
| 提前退休 | MNY≥8 | SPR+2，解锁 tag:leisure_senior | 放弃后续 MNY 增长 |
| 继续工作 | 无 | MNY+2 | STR-1 |
| 被迫退休 | MNY≤3（专属，仅低家境可见） | SPR-2 | 封锁 tag:leisure_senior |

### TWILIGHT · 70岁 · 晚年（必定触发）

**蝴蝶效应文本：** 若 30岁选了单身主义 → "你一个人走到了这里"

| 选项 | 条件 | 效果 |
|------|------|------|
| 与子女同住 | tag:family 在 eventTags 中（30岁未选单身） | SPR+3 |
| 入住养老院 | MNY≥5 | SPR+1 |
| 独居到底 | 无 | MNY+1, SPR-1 |

### CRISIS · 濒死危机（任意属性降至 0 时触发，每局一次）

描述文案由降至 0 的属性决定（如 MNY=0："你一分钱都没了……"）

| 选项 | 效果 |
|------|------|
| 孤注一掷 | 降至 0 的属性：70% 概率+3，30% 概率直接触发死亡事件 |
| 默默承受 | 该属性维持 0，不额外恶化 |

## Store 变更

### 新增状态

```ts
interface GameState {
  // ...existing fields...
  pendingChoice: MilestoneKey | null
  choiceHistory: ChoiceHistoryEntry[]
  eventTags: Set<string>               // 初始值 new Set(['college_life'])
  crisisTriggered: boolean             // 本局是否已触发过 CRISIS，确保最多一次
  legacyBuffs: LegacyBuff[]           // 从 localStorage 读入，跨局持久化
}

interface ChoiceHistoryEntry {
  milestone: MilestoneKey
  optionId: string
  age: number
}

interface LegacyBuff {
  id: string
  label: string                        // 如"书香门第"
  prop: 'CHR'|'INT'|'STR'|'MNY'|'SPR'
  delta: number                        // 通常为 +1
}
```

### 新增 actions

```ts
interface GameState {
  resolveChoice(optionId: string): void   // 应用效果，更新 eventTags，追加 choiceHistory，清除 pendingChoice
  unlockLegacyBuff(buff: LegacyBuff): void // finishSummary() 调用，写入 localStorage
}
```

### advance() 逻辑变更

```
advance():
  if pendingChoice !== null → return

  result = life.next()

  // 检查濒死（优先于里程碑）
  if !crisisTriggered && any core stat === 0:
    set pendingChoice = 'CRISIS', crisisTriggered = true
    return

  // 检查里程碑
  for each milestone in MILESTONES:
    if result.age === milestone.age (考虑 graduation 推迟)
      && milestone.triggerCondition?.(state) !== false
      && 未被 eventTags 封锁:
      set pendingChoice = milestone.key
      return

  // 正常追加
  set trajectoryLog = [...trajectoryLog, { age, result }]
```

### finishSummary() 变更

```
finishSummary():
  按 summary.SUM.grade 映射一条 LegacyBuff（SSSS→强buff，S→中buff，A以下→弱buff）
  调用 unlockLegacyBuff()，写入 localStorage（最多保留 5 条，超出则移除最旧）
  清除 pendingChoice, choiceHistory, eventTags, crisisTriggered
  set step = 'home'
```

## 局间成长 buff 表

| SUM grade | 解锁 buff |
|-----------|-----------|
| SSSS | 随机两条中择优（INT+1 或 MNY+1 或 CHR+1） |
| SSS / SS | 随机一条属性 +1 |
| S / A | 心态传承：初始 SPR+1 |
| B 及以下 | 无 buff |

## 架构说明

本 spec 分三个实现计划：

- **Plan A（UI 改版）**：纯视觉修改。改 Tailwind 类名、新增属性色彩 map、事件卡片组件改版、底部状态栏。
- **Plan B（选择系统）**：MilestoneConfig 数据、ChoiceCard 组件、store 状态扩展、advance() 逻辑变更、蝴蝶效应文本、条件概率计算。
- **Plan C（局间成长 + 危机）**：LegacyBuff 系统（localStorage）、CRISIS 节点、finishSummary() 变更。

执行顺序：Plan A → Plan B → Plan C。

## 不在范围内

- 修改原有事件/天赋 JSON 数据文件中的内容
- 增加新的游戏内事件（选择系统的事件标签只影响现有事件的触发概率）
- 动画/过渡效果（后续迭代）
- 多语言支持
- Web Share API 直接分享
