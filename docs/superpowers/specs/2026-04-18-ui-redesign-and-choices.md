# UI 全面改版 + 玩家选择系统 Design Spec

## Goal

将 lifeRestart 的全站 UI 从深色主题改为浅色现代风格，同时引入玩家主动抉择系统，让玩家在 4 个人生关键节点做出影响后续属性和事件的真实选择，大幅提升游戏参与感和重玩价值。

## Feature Scope

### Part 1: UI 全面改版

- 所有页面切换为浅色主题（白底 + 命运紫主色 #6366f1）
- 五维属性统一彩色徽章展示（粉/蓝/绿/黄/紫各对应一维）
- 天赋卡按 grade 颜色区分（SSSS=金、S=紫、A=靛、B=灰）
- 事件按 grade 有左边框颜色和背景色（SSSS=金橙、地狱=红、普通=灰）
- 轨迹页底部常驻年龄 + 人生阶段指示器
- 抉择事件内嵌在时间流中（不是覆盖弹窗）

### Part 2: 玩家选择系统

- 4 个人生节点，每局 4–7 个选项（因属性条件动态显示）
- 选择影响属性数值 + 解锁/封锁后续事件类别
- 带锁选项（🔒）：不满足条件时对玩家完全不可见
- 选择结果内联显示在轨迹流中（"你选择了：XXX"）

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
- 副标题（运行次数 / 总成就）
- "开始新的人生"按钮（命运紫）

### SetupPage（天赋 + 属性两步）

**天赋选择：**
- 天赋卡按 grade 背景色区分（见上方颜色映射）
- 右上角 grade 徽章
- 已选状态：边框变为 `#6366f1`，右上角出现 ✓

**属性分配：**
- 每维属性用彩色进度条（颜色同属性映射）
- 顶部显示剩余点数
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
- 底部按钮："分享海报"（ghost）+ "再来一次"（命运紫）

## 选择系统组件

### ChoiceCard（内嵌在轨迹流）

```ts
interface ChoiceCardProps {
  milestone: MilestoneKey        // 'GAOKAO' | 'GRADUATION' | 'MARRIAGE' | 'MIDLIFE'
  age: number
  options: ChoiceOption[]        // 经过条件过滤后的可用选项
  onSelect: (optionId: string) => void
}

interface ChoiceOption {
  id: string
  label: string                  // 显示文本，如"咬牙复读"
  emoji: string
  effects: Partial<Record<'CHR'|'INT'|'STR'|'MNY'|'SPR', number>>
  unlockTag?: string             // 注入到事件池的标签
  blockTag?: string              // 从事件池移除的标签
  hint: string                   // 效果提示，如"INT+1 · 下一年重新高考"
}
```

布局：
- 顶部：`⚡ 人生抉择 · X岁` 标题行（命运紫）
- 事件描述文字
- 选项列表：每个选项为白底圆角卡片，左侧 emoji，右侧效果提示
- 选中后：选中项变为命运紫背景，其余选项淡出，显示"你选择了：XXX"
- 选完后该 ChoiceCard 进入只读状态，不可再改

### MilestoneConfig（数据层）

```ts
interface MilestoneConfig {
  key: MilestoneKey
  age: number
  triggerCondition?: string      // undefined = 必定触发，否则为条件表达式
  description: string
  options: Array<ChoiceOption & { requireCondition?: string }>
}
```

### 四个节点完整配置

#### GAOKAO · 18岁 · 高考（必定触发）

| 选项 | 条件 | 效果 |
|------|------|------|
| 复读 | 无 | INT+1，下一年再次触发 GAOKAO（最多触发 2 次，第 2 次复读后强制进入普通大学） |
| 普通大学 | 无 | 无效果 |
| 名校 | INT≥7 | INT+2，解锁 tag:elite_career |
| 出国留学 | MNY≥7 | MNY-3, INT+1，解锁 tag:overseas |
| 直接打工 | 无 | MNY+2，封锁 tag:college_life |

#### GRADUATION · 22岁 · 毕业去向（若 18岁选了考研则推迟至 24岁；tag:college_life 被移除后不触发）

`college_life` tag 默认存在于 eventTags 中；GAOKAO 选项"直接打工"将其从 eventTags 移除。

| 选项 | 条件 | 效果 |
|------|------|------|
| 大厂打工 | INT≥5 | MNY+2, SPR-1 |
| 创业 | MNY≥5 | MNY±3（50%），解锁 tag:startup |
| 考研 | INT≥6 | INT+2, MNY-1，GRADUATION 节点推迟至 24岁 |
| 自由职业 | 无 | SPR+2, MNY+1 |

#### MARRIAGE · 30岁 · 婚姻（60% 概率触发）

| 选项 | 条件 | 效果 |
|------|------|------|
| 结婚 | CHR≥5 | SPR+2, MNY-1 |
| 闪婚 | CHR≥8 | SPR±3（50%） |
| 单身主义 | 无 | MNY+1, SPR-1 |

#### MIDLIFE · 40岁 · 中年危机（必定触发）

| 选项 | 条件 | 效果 |
|------|------|------|
| 继续拼搏 | 无 | MNY+2, SPR-2 |
| 躺平享受 | 无 | SPR+3, MNY-1 |
| 转型创业 | MNY≥6 | MNY±4（50%） |

## Store 变更

### 新增状态

```ts
interface GameState {
  // ...existing fields...
  pendingChoice: MilestoneKey | null    // 当前等待玩家选择的节点
  choiceHistory: Array<{               // 本局已完成的选择记录
    milestone: MilestoneKey
    optionId: string
    age: number
  }>
  eventTags: Set<string>               // 活跃的事件标签；初始值为 new Set(['college_life'])
}
```

### 新增 action

```ts
interface GameState {
  // ...
  resolveChoice(optionId: string): void   // 玩家做出选择，应用效果，清除 pendingChoice
}
```

### advance() 逻辑变更

```
advance():
  if pendingChoice !== null → return (等待玩家选择，不推进时间)
  result = life.next()
  检查当前 age 是否命中某个 MilestoneConfig.age
    且 triggerCondition 满足（或无条件）
    且 tag 封锁条件不满足
  如命中 → set pendingChoice = milestone.key
  否则正常追加 trajectoryLog
```

## 架构说明

本 spec 涵盖两个独立但视觉耦合的子系统，**分两个实现计划执行**：

- **Plan A（UI 改版）**：纯视觉修改，不涉及游戏逻辑。改 Tailwind 类名、新增属性色彩 map、事件卡片组件改版。
- **Plan B（选择系统）**：新增 MilestoneConfig 数据、store 状态、ChoiceCard 组件，以及 advance() 逻辑变更。

Plan A 先行，Plan B 依赖 Plan A 完成后的组件结构。

## 不在范围内

- 修改原有事件/天赋 JSON 数据文件中的内容
- 增加新的游戏内事件（选择系统的事件标签只影响现有事件的触发概率）
- 动画/过渡效果（后续迭代）
- 多语言支持
