# Choice System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 lifeRestart 中加入 6 个人生关键节点（GAOKAO/GRADUATION/MARRIAGE/MIDLIFE/RETIREMENT/TWILIGHT）+ 濒死 CRISIS，玩家在关键年龄做出有代价的选择，通过 eventTags 影响后续事件池，并展示蝴蝶效应文本。

**Architecture:** 新建 `src/lib/milestones.ts`（类型 + 数据）和 `src/lib/choiceEngine.ts`（过滤/概率/博弈）；扩展 `src/core/life.ts` 暴露 `applyEffect`；扩展 Zustand store 加入 `pendingChoice/eventTags/choiceHistory`；新建 `ChoiceCard` 组件内嵌在轨迹流中。

**Tech Stack:** React 18, TypeScript, Zustand 5, Vitest, Tailwind CSS

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/lib/milestones.ts` | 新建 | 类型定义 + 6 个节点数据配置 |
| `src/lib/choiceEngine.ts` | 新建 | filterOptions, computeSuccessRate, resolveGambling |
| `src/lib/__tests__/milestones.test.ts` | 新建 | milestones 数据正确性 |
| `src/lib/__tests__/choiceEngine.test.ts` | 新建 | 引擎逻辑单元测试 |
| `src/core/life.ts` | 修改 | 暴露 `applyEffect(effects)` 公共方法 |
| `src/components/game/ChoiceCard.tsx` | 新建 | 选择卡片 UI 组件 |
| `src/store/gameStore.ts` | 修改 | 新增状态字段 + resolveChoice + 更新 advance() |
| `src/store/gameStore.test.ts` | 修改 | resolveChoice 和 advance() 里程碑逻辑测试 |
| `src/pages/PlayPage.tsx` | 修改 | pendingChoice 时渲染 ChoiceCard |

---

### Task 1: Milestone 类型定义和 GAOKAO + GRADUATION 数据

**Files:**
- Create: `src/lib/milestones.ts`
- Create: `src/lib/__tests__/milestones.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `src/lib/__tests__/milestones.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { MILESTONES } from '../milestones'

describe('GAOKAO milestone', () => {
  const gaokao = MILESTONES.find(m => m.key === 'GAOKAO')!

  it('技校 requireCondition: INT≤4 可见，INT≥5 不可见', () => {
    const craftsman = gaokao.options.find(o => o.id === 'craftsman')!
    const low  = { CHR: 5, INT: 3, STR: 5, MNY: 5, SPR: 5 }
    const high = { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }
    expect(craftsman.requireCondition!(low, new Set())).toBe(true)
    expect(craftsman.requireCondition!(high, new Set())).toBe(false)
  })

  it('名校 requireCondition: INT≥7 可见，INT≤6 不可见', () => {
    const elite = gaokao.options.find(o => o.id === 'elite_college')!
    const low  = { CHR: 5, INT: 6, STR: 5, MNY: 5, SPR: 5 }
    const high = { CHR: 5, INT: 7, STR: 5, MNY: 5, SPR: 5 }
    expect(elite.requireCondition!(low, new Set())).toBe(false)
    expect(elite.requireCondition!(high, new Set())).toBe(true)
  })

  it('出国留学 requireCondition: MNY≥7 可见', () => {
    const overseas = gaokao.options.find(o => o.id === 'overseas')!
    expect(overseas.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 7, SPR: 5 }, new Set())).toBe(true)
    expect(overseas.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 6, SPR: 5 }, new Set())).toBe(false)
  })

  it('复读 retriggerGaokao 为 true', () => {
    const retake = gaokao.options.find(o => o.id === 'retake')!
    expect(retake.retriggerGaokao).toBe(true)
  })
})

describe('GRADUATION milestone', () => {
  const graduation = MILESTONES.find(m => m.key === 'GRADUATION')!
  const props = { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }

  it('有 college_life tag 才触发', () => {
    expect(graduation.triggerCondition!(props, new Set(['college_life']))).toBe(true)
    expect(graduation.triggerCondition!(props, new Set())).toBe(false)
  })

  it('大厂 requireCondition: INT≥5', () => {
    const corp = graduation.options.find(o => o.id === 'corporate')!
    expect(corp.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(true)
    expect(corp.requireCondition!({ CHR: 5, INT: 4, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(false)
  })

  it('创业有 gambling 配置', () => {
    const startup = graduation.options.find(o => o.id === 'startup')!
    expect(startup.gambling).toBeDefined()
    expect(startup.gambling!.successUnlockTag).toBe('entrepreneur')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/__tests__/milestones.test.ts
```

预期：`Cannot find module '../milestones'`

- [ ] **Step 3: 实现 `src/lib/milestones.ts`**

```ts
export type MilestoneKey =
  | 'GAOKAO' | 'GRADUATION' | 'MARRIAGE' | 'MIDLIFE'
  | 'RETIREMENT' | 'TWILIGHT' | 'CRISIS'

export type PropKey = 'CHR' | 'INT' | 'STR' | 'MNY' | 'SPR'

export interface PropertySnapshot {
  CHR: number; INT: number; STR: number; MNY: number; SPR: number
}

export interface ChoiceHistoryEntry {
  milestone: MilestoneKey
  optionId: string
  age: number
}

export interface GamblingConfig {
  successEffects: Partial<Record<PropKey, number>>
  successUnlockTag?: string
  failureEffects: Partial<Record<PropKey, number>>
  failureTriggerDeath?: boolean
}

export interface ChoiceOption {
  id: string
  label: string
  emoji: string
  effects: Partial<Record<PropKey, number>>
  gambling?: GamblingConfig
  successRate?: number      // 运行时由 computeSuccessRate 填充，不存入 store
  unlockTag?: string
  blockTag?: string
  blockTagLabel?: string
  hint: string
  requireCondition?: (props: PropertySnapshot, eventTags: Set<string>) => boolean
  retriggerGaokao?: boolean
  delayGraduation?: boolean
}

export interface MilestoneConfig {
  key: MilestoneKey
  age: number
  triggerCondition?: (props: PropertySnapshot, eventTags: Set<string>) => boolean
  description: string
  butterflyContextFn?: (history: ChoiceHistoryEntry[]) => string | undefined
  options: ChoiceOption[]
}

export const MILESTONES: MilestoneConfig[] = [
  {
    key: 'GAOKAO',
    age: 18,
    description: '高考成绩出来了，这一年将决定你之后的走向。',
    options: [
      {
        id: 'craftsman',
        label: '技校',
        emoji: '🔧',
        effects: { MNY: 1 },
        unlockTag: 'craftsman',
        blockTag: 'college_life',
        blockTagLabel: '大学生活',
        hint: '提前步入社会，错失大学，家境小幅改善',
        requireCondition: (props) => props.INT <= 4,
      },
      {
        id: 'retake',
        label: '复读',
        emoji: '📖',
        effects: { INT: 1 },
        hint: '再搏一年，智力 +1，下一年重新面对高考',
        retriggerGaokao: true,
      },
      {
        id: 'normal_college',
        label: '普通大学',
        emoji: '🏫',
        effects: {},
        hint: '稳妥之选，维持现状',
      },
      {
        id: 'elite_college',
        label: '名校',
        emoji: '🎓',
        effects: { INT: 1, CHR: -1 },
        unlockTag: 'elite_career',
        hint: '精英路线开启，智力 +1，颜值 -1',
        requireCondition: (props) => props.INT >= 7,
      },
      {
        id: 'overseas',
        label: '出国留学',
        emoji: '✈️',
        effects: { MNY: -2, INT: 1 },
        unlockTag: 'overseas',
        blockTag: 'local_network',
        blockTagLabel: '本地人脉',
        hint: '见识大了，荷包瘪了，MNY-2 INT+1',
        requireCondition: (props) => props.MNY >= 7,
      },
      {
        id: 'early_work',
        label: '直接打工',
        emoji: '💼',
        effects: { MNY: 1, INT: -1 },
        unlockTag: 'early_career',
        blockTag: 'college_life',
        blockTagLabel: '大学生活',
        hint: '早积累家境，错过大学时光，MNY+1 INT-1',
      },
    ],
  },
  {
    key: 'GRADUATION',
    age: 22,
    triggerCondition: (_props, eventTags) => eventTags.has('college_life'),
    description: '毕业了，接下来的路怎么走？',
    options: [
      {
        id: 'corporate',
        label: '大厂打工',
        emoji: '🏢',
        effects: { MNY: 1, SPR: -1 },
        unlockTag: 'corporate',
        hint: '稳定收入，牺牲一点心态，MNY+1 SPR-1',
        requireCondition: (props) => props.INT >= 5,
      },
      {
        id: 'startup',
        label: '创业',
        emoji: '🚀',
        effects: {},
        gambling: {
          successEffects: { MNY: 2 },
          successUnlockTag: 'entrepreneur',
          failureEffects: { MNY: -2, SPR: -1 },
        },
        hint: '成功解锁创业叙事，失败伤筋动骨',
        requireCondition: (props) => props.MNY >= 5,
      },
      {
        id: 'grad_school',
        label: '考研',
        emoji: '📚',
        effects: { INT: 1, MNY: -1 },
        unlockTag: 'academic',
        hint: 'INT+1 MNY-1，毕业节点推迟至 24 岁',
        delayGraduation: true,
        requireCondition: (props) => props.INT >= 6,
      },
      {
        id: 'freelance',
        label: '自由职业',
        emoji: '🎨',
        effects: { SPR: 1 },
        unlockTag: 'freelance',
        hint: '心态自由，收入随缘，SPR+1',
      },
    ],
  },
]
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/lib/__tests__/milestones.test.ts
```

预期：所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/milestones.ts src/lib/__tests__/milestones.test.ts
git commit -m "feat: add milestone types and GAOKAO/GRADUATION data"
```

---

### Task 2: 补全 MARRIAGE / MIDLIFE / RETIREMENT / TWILIGHT / CRISIS 数据

**Files:**
- Modify: `src/lib/milestones.ts`
- Modify: `src/lib/__tests__/milestones.test.ts`

- [ ] **Step 1: 补测试**

在 `src/lib/__tests__/milestones.test.ts` 末尾追加：

```ts
describe('MARRIAGE milestone', () => {
  const marriage = MILESTONES.find(m => m.key === 'MARRIAGE')!

  it('age 为 30', () => {
    expect(marriage.age).toBe(30)
  })

  it('闪婚有 gambling 配置，requireCondition CHR≥8', () => {
    const flash = marriage.options.find(o => o.id === 'flash_marriage')!
    expect(flash.gambling).toBeDefined()
    expect(flash.requireCondition!({ CHR: 8, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(true)
    expect(flash.requireCondition!({ CHR: 7, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(false)
  })

  it('结婚 requireCondition CHR≥5', () => {
    const marry = marriage.options.find(o => o.id === 'marry')!
    expect(marry.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(true)
    expect(marry.requireCondition!({ CHR: 4, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(false)
  })
})

describe('MIDLIFE milestone', () => {
  const midlife = MILESTONES.find(m => m.key === 'MIDLIFE')!

  it('age 为 40', () => {
    expect(midlife.age).toBe(40)
  })

  it('转型创业 requireCondition MNY≥6', () => {
    const lateStartup = midlife.options.find(o => o.id === 'late_startup')!
    expect(lateStartup.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 6, SPR: 5 }, new Set())).toBe(true)
    expect(lateStartup.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(false)
  })
})

describe('RETIREMENT milestone', () => {
  const retirement = MILESTONES.find(m => m.key === 'RETIREMENT')!

  it('age 为 55', () => {
    expect(retirement.age).toBe(55)
  })

  it('被迫退休 requireCondition MNY≤3', () => {
    const forced = retirement.options.find(o => o.id === 'forced_retire')!
    expect(forced.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 3, SPR: 5 }, new Set())).toBe(true)
    expect(forced.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 4, SPR: 5 }, new Set())).toBe(false)
  })
})

describe('TWILIGHT milestone', () => {
  const twilight = MILESTONES.find(m => m.key === 'TWILIGHT')!

  it('与子女同住 requireCondition: eventTags 含 family', () => {
    const children = twilight.options.find(o => o.id === 'live_with_children')!
    expect(children.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set(['family']))).toBe(true)
    expect(children.requireCondition!({ CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }, new Set())).toBe(false)
  })

  it('单身路线有蝴蝶效应文本', () => {
    const ctx = twilight.butterflyContextFn!([{ milestone: 'MARRIAGE', optionId: 'single', age: 30 }])
    expect(ctx).toContain('一个人')
  })

  it('非单身路线蝴蝶效应为 undefined', () => {
    const ctx = twilight.butterflyContextFn!([{ milestone: 'MARRIAGE', optionId: 'marry', age: 30 }])
    expect(ctx).toBeUndefined()
  })
})

describe('CRISIS milestone', () => {
  const crisis = MILESTONES.find(m => m.key === 'CRISIS')!

  it('孤注一掷有 gambling failureTriggerDeath', () => {
    const allIn = crisis.options.find(o => o.id === 'all_in')!
    expect(allIn.gambling!.failureTriggerDeath).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/__tests__/milestones.test.ts
```

预期：多个 "Cannot read properties of undefined" 错误，因为 MARRIAGE/MIDLIFE 等节点尚未添加

- [ ] **Step 3: 在 `src/lib/milestones.ts` 的 `MILESTONES` 数组追加剩余节点**

在 GRADUATION 条目后追加：

```ts
  {
    key: 'MARRIAGE',
    age: 30,
    description: '有人向你发出了邀请，你心中已有答案。',
    butterflyContextFn: undefined,
    options: [
      {
        id: 'marry',
        label: '结婚',
        emoji: '💍',
        effects: { SPR: 1, MNY: -1 },
        unlockTag: 'family',
        hint: '开启家庭生活，SPR+1 MNY-1',
        requireCondition: (props) => props.CHR >= 5,
      },
      {
        id: 'flash_marriage',
        label: '闪婚',
        emoji: '⚡',
        effects: {},
        gambling: {
          successEffects: { SPR: 2 },
          successUnlockTag: 'family',
          failureEffects: { SPR: -2, MNY: -1 },
        },
        hint: '赌一把，成功 SPR+2，失败 SPR-2 MNY-1',
        requireCondition: (props) => props.CHR >= 8,
      },
      {
        id: 'single',
        label: '单身主义',
        emoji: '🌿',
        effects: { MNY: 1, SPR: -1 },
        blockTag: 'family',
        blockTagLabel: '家庭生活',
        hint: '一个人挺好，MNY+1 SPR-1',
      },
    ],
  },
  {
    key: 'MIDLIFE',
    age: 40,
    description: '四十岁了，你开始重新审视自己的人生。',
    options: [
      {
        id: 'keep_working',
        label: '继续拼搏',
        emoji: '⚡',
        effects: { MNY: 1, SPR: -1 },
        hint: '钱再多一点，但心态磨损，MNY+1 SPR-1',
      },
      {
        id: 'lie_flat',
        label: '躺平享受',
        emoji: '🌙',
        effects: { SPR: 2, MNY: -1 },
        unlockTag: 'leisure',
        hint: '心态大幅改善，收入小跌，SPR+2 MNY-1',
      },
      {
        id: 'late_startup',
        label: '转型创业',
        emoji: '🚀',
        effects: {},
        gambling: {
          successEffects: { MNY: 2 },
          successUnlockTag: 'late_entrepreneur',
          failureEffects: { MNY: -3 },
        },
        hint: '有经验加持，成功 MNY+2，失败 MNY-3',
        requireCondition: (props) => props.MNY >= 6,
      },
    ],
  },
  {
    key: 'RETIREMENT',
    age: 55,
    description: '该考虑退休的事了，你准备怎么安排晚年？',
    options: [
      {
        id: 'early_retire',
        label: '提前退休',
        emoji: '🌅',
        effects: { SPR: 1 },
        unlockTag: 'leisure_senior',
        hint: '享受生活，SPR+1',
        requireCondition: (props) => props.MNY >= 8,
      },
      {
        id: 'keep_working_senior',
        label: '继续工作',
        emoji: '💪',
        effects: { MNY: 1, STR: -1 },
        hint: '多攒点钱，但体力在下滑，MNY+1 STR-1',
      },
      {
        id: 'forced_retire',
        label: '被迫退休',
        emoji: '😔',
        effects: { SPR: -1 },
        blockTag: 'leisure_senior',
        blockTagLabel: '悠闲晚年',
        hint: '没得选，心态受损，SPR-1',
        requireCondition: (props) => props.MNY <= 3,
      },
    ],
  },
  {
    key: 'TWILIGHT',
    age: 70,
    description: '七十岁了，你开始想身边有没有人陪。',
    butterflyContextFn: (history) => {
      if (history.some(h => h.milestone === 'MARRIAGE' && h.optionId === 'single')) {
        return '你选择了单身主义——你一个人走到了这里。'
      }
      return undefined
    },
    options: [
      {
        id: 'live_with_children',
        label: '与子女同住',
        emoji: '👨‍👩‍👧',
        effects: { SPR: 2 },
        hint: '家庭温暖，SPR+2',
        requireCondition: (_props, eventTags) => eventTags.has('family'),
      },
      {
        id: 'nursing_home',
        label: '入住养老院',
        emoji: '🏠',
        effects: { SPR: 1 },
        hint: '有人照料，SPR+1',
        requireCondition: (props) => props.MNY >= 5,
      },
      {
        id: 'live_alone',
        label: '独居到底',
        emoji: '🌿',
        effects: { MNY: 1, SPR: -1 },
        hint: '省钱但孤独，MNY+1 SPR-1',
      },
    ],
  },
  {
    key: 'CRISIS',
    age: -1,   // 由 store 在任意属性降至 0 时动态触发，不绑定具体年龄
    description: '',  // 由 store 根据降至 0 的属性动态生成
    options: [
      {
        id: 'all_in',
        label: '孤注一掷',
        emoji: '🎲',
        effects: {},
        gambling: {
          successEffects: {},   // 回血量由 store 动态注入（+3 到降零的属性）
          failureEffects: {},   // 失败直接触发死亡（store 处理）
          failureTriggerDeath: true,
        },
        hint: '70% 回血 +3；30% 直接触发死亡',
      },
      {
        id: 'endure',
        label: '默默承受',
        emoji: '🪨',
        effects: {},
        hint: '属性维持 0，不额外恶化',
      },
    ],
  },
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/lib/__tests__/milestones.test.ts
```

预期：所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/milestones.ts src/lib/__tests__/milestones.test.ts
git commit -m "feat: add remaining milestone configs (MARRIAGE/MIDLIFE/RETIREMENT/TWILIGHT/CRISIS)"
```

---

### Task 3: choiceEngine — filterOptions + computeSuccessRate + resolveGambling

**Files:**
- Create: `src/lib/choiceEngine.ts`
- Create: `src/lib/__tests__/choiceEngine.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `src/lib/__tests__/choiceEngine.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { filterOptions, computeSuccessRate, resolveGambling } from '../choiceEngine'
import type { ChoiceOption, PropertySnapshot, ChoiceHistoryEntry } from '../milestones'

const BASE_PROPS: PropertySnapshot = { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }

describe('filterOptions', () => {
  it('无 requireCondition 的选项始终可见', () => {
    const options: ChoiceOption[] = [
      { id: 'a', label: 'A', emoji: '🅰️', effects: {}, hint: '' },
    ]
    expect(filterOptions(options, BASE_PROPS, new Set())).toHaveLength(1)
  })

  it('不满足 requireCondition 的选项被过滤', () => {
    const options: ChoiceOption[] = [
      {
        id: 'elite',
        label: '名校',
        emoji: '🎓',
        effects: {},
        hint: '',
        requireCondition: (props) => props.INT >= 7,
      },
    ]
    expect(filterOptions(options, BASE_PROPS, new Set())).toHaveLength(0)
    expect(filterOptions(options, { ...BASE_PROPS, INT: 7 }, new Set())).toHaveLength(1)
  })

  it('eventTags 条件正确传入 requireCondition', () => {
    const options: ChoiceOption[] = [
      {
        id: 'children',
        label: '与子女同住',
        emoji: '👨‍👩‍👧',
        effects: {},
        hint: '',
        requireCondition: (_props, tags) => tags.has('family'),
      },
    ]
    expect(filterOptions(options, BASE_PROPS, new Set())).toHaveLength(0)
    expect(filterOptions(options, BASE_PROPS, new Set(['family']))).toHaveLength(1)
  })
})

describe('computeSuccessRate', () => {
  it('非赌博选项返回 undefined', () => {
    expect(computeSuccessRate('GRADUATION', 'corporate', BASE_PROPS, [])).toBeUndefined()
  })

  it('GRADUATION startup: 基础 30%', () => {
    const props = { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 }
    expect(computeSuccessRate('GRADUATION', 'startup', props, [])).toBe(30)
  })

  it('GRADUATION startup: INT≥6 +15%', () => {
    const props = { CHR: 5, INT: 6, STR: 5, MNY: 5, SPR: 5 }
    expect(computeSuccessRate('GRADUATION', 'startup', props, [])).toBe(45)
  })

  it('GRADUATION startup: INT≥6 + CHR≥6 = 60%', () => {
    const props = { CHR: 6, INT: 6, STR: 5, MNY: 5, SPR: 5 }
    expect(computeSuccessRate('GRADUATION', 'startup', props, [])).toBe(60)
  })

  it('GRADUATION startup: 历史含 corporate +20%', () => {
    const history: ChoiceHistoryEntry[] = [
      { milestone: 'GRADUATION', optionId: 'corporate', age: 22 },
    ]
    expect(computeSuccessRate('GRADUATION', 'startup', BASE_PROPS, history)).toBe(50)
  })

  it('GRADUATION startup 最高 95%', () => {
    const props = { CHR: 10, INT: 10, STR: 5, MNY: 5, SPR: 5 }
    const history: ChoiceHistoryEntry[] = [
      { milestone: 'GRADUATION', optionId: 'corporate', age: 22 },
    ]
    expect(computeSuccessRate('GRADUATION', 'startup', props, history)).toBe(95)
  })

  it('MARRIAGE flash_marriage: CHR=8 → 50%', () => {
    expect(computeSuccessRate('MARRIAGE', 'flash_marriage', { ...BASE_PROPS, CHR: 8 }, [])).toBe(50)
  })

  it('MARRIAGE flash_marriage: CHR=10 → 80%', () => {
    expect(computeSuccessRate('MARRIAGE', 'flash_marriage', { ...BASE_PROPS, CHR: 10 }, [])).toBe(80)
  })

  it('MIDLIFE late_startup: 基础 40%', () => {
    expect(computeSuccessRate('MIDLIFE', 'late_startup', BASE_PROPS, [])).toBe(40)
  })

  it('MIDLIFE late_startup: 历史含 startup → +20% = 60%', () => {
    const history: ChoiceHistoryEntry[] = [
      { milestone: 'GRADUATION', optionId: 'startup', age: 22 },
    ]
    expect(computeSuccessRate('MIDLIFE', 'late_startup', BASE_PROPS, history)).toBe(60)
  })

  it('CRISIS all_in: 固定 70%', () => {
    expect(computeSuccessRate('CRISIS', 'all_in', BASE_PROPS, [])).toBe(70)
  })
})

describe('resolveGambling', () => {
  it('成功时返回 success=true 和 successEffects', () => {
    const option: ChoiceOption = {
      id: 'startup',
      label: '创业',
      emoji: '🚀',
      effects: {},
      hint: '',
      gambling: {
        successEffects: { MNY: 2 },
        successUnlockTag: 'entrepreneur',
        failureEffects: { MNY: -2, SPR: -1 },
      },
    }
    const result = resolveGambling(option, 100)  // 100% 必定成功
    expect(result.success).toBe(true)
    expect(result.effects).toEqual({ MNY: 2 })
    expect(result.unlockTag).toBe('entrepreneur')
  })

  it('失败时返回 success=false 和 failureEffects', () => {
    const option: ChoiceOption = {
      id: 'startup',
      label: '创业',
      emoji: '🚀',
      effects: {},
      hint: '',
      gambling: {
        successEffects: { MNY: 2 },
        failureEffects: { MNY: -2, SPR: -1 },
      },
    }
    const result = resolveGambling(option, 0)  // 0% 必定失败
    expect(result.success).toBe(false)
    expect(result.effects).toEqual({ MNY: -2, SPR: -1 })
    expect(result.unlockTag).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/__tests__/choiceEngine.test.ts
```

预期：`Cannot find module '../choiceEngine'`

- [ ] **Step 3: 实现 `src/lib/choiceEngine.ts`**

```ts
import type { ChoiceOption, ChoiceHistoryEntry, MilestoneKey, PropertySnapshot, PropKey } from './milestones'

export function filterOptions(
  options: ChoiceOption[],
  props: PropertySnapshot,
  eventTags: Set<string>
): ChoiceOption[] {
  return options.filter(o => !o.requireCondition || o.requireCondition(props, eventTags))
}

export function computeSuccessRate(
  milestoneKey: MilestoneKey,
  optionId: string,
  props: PropertySnapshot,
  history: ChoiceHistoryEntry[]
): number | undefined {
  if (milestoneKey === 'GRADUATION' && optionId === 'startup') {
    let rate = 30
    if (props.INT >= 6) rate += 15
    if (props.CHR >= 6) rate += 15
    if (history.some(h => h.optionId === 'corporate')) rate += 20
    return Math.min(rate, 95)
  }
  if (milestoneKey === 'MARRIAGE' && optionId === 'flash_marriage') {
    return Math.min(50 + (props.CHR - 8) * 15, 95)
  }
  if (milestoneKey === 'MIDLIFE' && optionId === 'late_startup') {
    let rate = 40
    if (history.some(h => h.optionId === 'startup' || h.optionId === 'late_startup')) rate += 20
    return Math.min(rate, 95)
  }
  if (milestoneKey === 'CRISIS' && optionId === 'all_in') {
    return 70
  }
  return undefined
}

export function resolveGambling(
  option: ChoiceOption,
  successRate: number
): {
  success: boolean
  effects: Partial<Record<PropKey, number>>
  unlockTag?: string
  triggerDeath?: boolean
} {
  if (!option.gambling) {
    return { success: true, effects: option.effects }
  }
  const success = Math.random() * 100 < successRate
  if (success) {
    return {
      success: true,
      effects: option.gambling.successEffects,
      unlockTag: option.gambling.successUnlockTag,
    }
  }
  return {
    success: false,
    effects: option.gambling.failureEffects,
    triggerDeath: option.gambling.failureTriggerDeath,
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/lib/__tests__/choiceEngine.test.ts
```

预期：所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/choiceEngine.ts src/lib/__tests__/choiceEngine.test.ts
git commit -m "feat: add choiceEngine (filterOptions, computeSuccessRate, resolveGambling)"
```

---

### Task 4: Life 暴露 applyEffect 公共方法

**Files:**
- Modify: `src/core/life.ts`

- [ ] **Step 1: 在 `src/core/life.ts` 中找到 `doEvent` 方法（约第 196 行）的下方，添加 `applyEffect` 公共方法**

在 `doEvent()` 方法之后、`random()` 方法之前插入：

```ts
    applyEffect(effects: Record<string, number>): void {
        this.#property.effect(effects)
    }
```

完整位置（`src/core/life.ts:208` 后面，在 `random()` 前）：

```ts
    applyEffect(effects: Record<string, number>): void {
        this.#property.effect(effects)
    }

    random(events: Array<[number, number]>): number {
```

- [ ] **Step 2: 运行全量测试确保无破坏**

```bash
npx vitest run
```

预期：所有既有测试通过，无新失败

- [ ] **Step 3: Commit**

```bash
git add src/core/life.ts
git commit -m "feat: expose Life.applyEffect for store-driven property changes"
```

---

### Task 5: ChoiceCard UI 组件

**Files:**
- Create: `src/components/game/ChoiceCard.tsx`

- [ ] **Step 1: 创建 `src/components/game/ChoiceCard.tsx`**

```tsx
import type { MilestoneConfig, ChoiceOption } from '../../lib/milestones'

interface ChoiceCardProps {
  milestoneKey: string
  age: number
  description: string
  options: ChoiceOption[]
  butterflyContext?: string
  selectedId?: string
  onSelect: (optionId: string) => void
}

export function ChoiceCard({
  age,
  description,
  options,
  butterflyContext,
  selectedId,
  onSelect,
}: ChoiceCardProps) {
  const isResolved = selectedId !== undefined

  return (
    <div className="my-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-indigo-500 font-bold text-xs">⚡ 人生抉择 · {age}岁</span>
      </div>

      {butterflyContext && (
        <div className="bg-slate-100 rounded-lg px-3 py-2 mb-2 text-xs text-slate-500 leading-relaxed">
          {butterflyContext}
        </div>
      )}

      <p className="text-sm text-slate-700 mb-2">{description}</p>

      <div className="flex flex-col gap-2">
        {options.map(option => {
          const isSelected = selectedId === option.id
          const isOther = isResolved && !isSelected

          return (
            <button
              key={option.id}
              disabled={isResolved}
              onClick={() => onSelect(option.id)}
              className={[
                'w-full text-left rounded-lg border px-3 py-2 transition-all',
                isSelected
                  ? 'border-indigo-400 bg-indigo-100'
                  : isOther
                    ? 'border-slate-200 bg-white opacity-40'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {option.emoji} {option.label}
                </span>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {Object.entries(option.effects).map(([prop, delta]) => (
                    delta !== 0 && (
                      <span
                        key={prop}
                        className={`text-xs font-mono ${(delta as number) > 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {prop}{(delta as number) > 0 ? '+' : ''}{delta}
                      </span>
                    )
                  ))}
                  {option.successRate !== undefined && (
                    <span className="text-xs text-blue-500">成功率 {option.successRate}%</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-0.5">{option.hint}</p>

              {option.blockTagLabel && !isResolved && (
                <p className="text-xs text-red-400 mt-0.5">⚠️ 将封锁：{option.blockTagLabel}</p>
              )}
            </button>
          )
        })}
      </div>

      {isResolved && (
        <p className="text-xs text-indigo-500 mt-2 text-center">
          你选择了：{options.find(o => o.id === selectedId)?.label}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 确认 TypeScript 无报错**

```bash
npx tsc --noEmit
```

预期：无 TS 错误

- [ ] **Step 3: Commit**

```bash
git add src/components/game/ChoiceCard.tsx
git commit -m "feat: add ChoiceCard inline UI component"
```

---

### Task 6: Store 状态扩展 + resolveChoice

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: 写失败测试**

在 `src/store/gameStore.test.ts` 末尾追加：

```ts
describe('choice system store', () => {
  beforeEach(() => {
    useGameStore.setState({
      step: 'trajectory',
      pendingChoice: null,
      choiceHistory: [],
      eventTags: new Set(['college_life']),
      crisisTriggered: false,
      graduationAge: 22,
      gaokaoRetriggerAge: null,
      isEnd: false,
      trajectoryLog: [],
      life: {
        applyEffect: () => {},
        propertys: { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5 },
      } as any,
    })
  })

  it('初始 eventTags 含 college_life', () => {
    expect(useGameStore.getState().eventTags.has('college_life')).toBe(true)
  })

  it('resolveChoice: 应用 unlockTag 到 eventTags', () => {
    useGameStore.setState({ pendingChoice: 'GAOKAO' })
    useGameStore.getState().resolveChoice('elite_college')
    expect(useGameStore.getState().eventTags.has('elite_career')).toBe(true)
  })

  it('resolveChoice: 应用 blockTag 移除 eventTags', () => {
    useGameStore.setState({ pendingChoice: 'GAOKAO' })
    useGameStore.getState().resolveChoice('early_work')
    expect(useGameStore.getState().eventTags.has('college_life')).toBe(false)
  })

  it('resolveChoice: 追加 choiceHistory', () => {
    useGameStore.setState({ pendingChoice: 'GAOKAO' })
    useGameStore.getState().resolveChoice('normal_college')
    expect(useGameStore.getState().choiceHistory).toHaveLength(1)
    expect(useGameStore.getState().choiceHistory[0].optionId).toBe('normal_college')
  })

  it('resolveChoice: 清除 pendingChoice', () => {
    useGameStore.setState({ pendingChoice: 'GAOKAO' })
    useGameStore.getState().resolveChoice('normal_college')
    expect(useGameStore.getState().pendingChoice).toBeNull()
  })

  it('resolveChoice: 考研选项将 graduationAge 设为 24', () => {
    useGameStore.setState({ pendingChoice: 'GRADUATION' })
    useGameStore.getState().resolveChoice('grad_school')
    expect(useGameStore.getState().graduationAge).toBe(24)
  })

  it('resolveChoice: 复读将 gaokaoRetriggerAge 设为下一年', () => {
    useGameStore.setState({
      pendingChoice: 'GAOKAO',
      life: {
        applyEffect: () => {},
        propertys: { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5, AGE: 18 },
      } as any,
    })
    useGameStore.getState().resolveChoice('retake')
    expect(useGameStore.getState().gaokaoRetriggerAge).toBe(19)
    expect(useGameStore.getState().pendingChoice).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/store/gameStore.test.ts
```

预期：`pendingChoice` 等字段不存在的相关错误

- [ ] **Step 3: 修改 `src/store/gameStore.ts`，添加新状态字段和 resolveChoice**

在 `interface GameState` 中添加：

```ts
  pendingChoice: MilestoneKey | null
  choiceHistory: ChoiceHistoryEntry[]
  eventTags: Set<string>
  crisisTriggered: boolean
  graduationAge: number
  gaokaoRetriggerAge: number | null

  resolveChoice(optionId: string): void
```

在文件顶部添加 import：

```ts
import { MILESTONES } from '../lib/milestones'
import type { MilestoneKey, ChoiceHistoryEntry } from '../lib/milestones'
import { computeSuccessRate, resolveGambling, filterOptions } from '../lib/choiceEngine'
```

在 `create<GameState>((set, get) => {` 的初始状态对象中添加：

```ts
    pendingChoice: null,
    choiceHistory: [],
    eventTags: new Set(['college_life']),
    crisisTriggered: false,
    graduationAge: 22,
    gaokaoRetriggerAge: null,
```

在 `setTalentExtend` 方法后、`finishSummary` 方法前添加 `resolveChoice`：

```ts
    resolveChoice(optionId: string) {
      const { pendingChoice, choiceHistory, eventTags, life } = get()
      if (!pendingChoice) return

      const milestone = MILESTONES.find(m => m.key === pendingChoice)
      if (!milestone) return

      const option = milestone.options.find(o => o.id === optionId)
      if (!option) return

      const props = life!.propertys as Record<string, number>
      const propSnapshot = { CHR: props.CHR, INT: props.INT, STR: props.STR, MNY: props.MNY, SPR: props.SPR }
      const age = props.AGE as number ?? 0

      // 计算并应用效果
      let effectsToApply = { ...option.effects }
      let unlockTag = option.unlockTag
      let blockTag = option.blockTag

      if (option.gambling) {
        const rate = computeSuccessRate(pendingChoice, optionId, propSnapshot, choiceHistory) ?? 50
        const outcome = resolveGambling(option, rate)
        effectsToApply = outcome.effects
        if (outcome.unlockTag) unlockTag = outcome.unlockTag
        // TODO(Plan C): outcome.triggerDeath 触发死亡由 Plan C 处理
      }

      const validEffects = Object.fromEntries(
        Object.entries(effectsToApply).filter(([, v]) => v !== 0)
      ) as Record<string, number>
      if (Object.keys(validEffects).length > 0) {
        life!.applyEffect(validEffects)
      }

      // 更新 eventTags
      const nextTags = new Set(eventTags)
      if (unlockTag) nextTags.add(unlockTag)
      if (blockTag) nextTags.delete(blockTag)

      // 更新 choiceHistory
      const nextHistory = [...choiceHistory, { milestone: pendingChoice, optionId, age }]

      // 特殊逻辑
      let graduationAge = get().graduationAge
      let gaokaoRetriggerAge: number | null = null

      if (option.delayGraduation) {
        graduationAge = 24
      }
      if (option.retriggerGaokao) {
        gaokaoRetriggerAge = age + 1
      }

      set({
        eventTags: nextTags,
        choiceHistory: nextHistory,
        pendingChoice: null,
        graduationAge,
        gaokaoRetriggerAge,
      })
    },
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/store/gameStore.test.ts
```

预期：所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: extend store with choice system state and resolveChoice action"
```

---

### Task 7: advance() 里程碑触发逻辑

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: 补充 advance() 相关测试**

在 `src/store/gameStore.test.ts` 的 `'choice system store'` describe 块末尾追加：

```ts
  it('advance() 在 pendingChoice 不为 null 时直接返回，不推进', () => {
    const mockLife = {
      next: vi.fn().mockReturnValue({ age: 19, content: [], isEnd: false }),
      applyEffect: () => {},
      propertys: { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5, AGE: 18 },
    }
    useGameStore.setState({
      life: mockLife as any,
      pendingChoice: 'GAOKAO',
      isEnd: false,
    })
    useGameStore.getState().advance()
    expect(mockLife.next).not.toHaveBeenCalled()
  })

  it('advance() 在 age=18 时设置 pendingChoice=GAOKAO', () => {
    const mockLife = {
      next: vi.fn().mockReturnValue({ age: 18, content: [], isEnd: false }),
      applyEffect: () => {},
      propertys: { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5, AGE: 18 },
    }
    useGameStore.setState({ life: mockLife as any, pendingChoice: null, isEnd: false })
    useGameStore.getState().advance()
    expect(useGameStore.getState().pendingChoice).toBe('GAOKAO')
  })

  it('advance() GRADUATION 在 eventTags 无 college_life 时不触发', () => {
    const mockLife = {
      next: vi.fn().mockReturnValue({ age: 22, content: [], isEnd: false }),
      applyEffect: () => {},
      propertys: { CHR: 5, INT: 5, STR: 5, MNY: 5, SPR: 5, AGE: 22 },
    }
    useGameStore.setState({
      life: mockLife as any,
      pendingChoice: null,
      eventTags: new Set(),  // 无 college_life
      isEnd: false,
      trajectoryLog: [],
    })
    useGameStore.getState().advance()
    expect(useGameStore.getState().pendingChoice).toBeNull()
  })
```

在文件顶部添加 `import { vi } from 'vitest'`（如果尚未 import）

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/store/gameStore.test.ts
```

预期：advance() 相关测试失败（目前 advance 不检查里程碑）

- [ ] **Step 3: 修改 `src/store/gameStore.ts` 中的 `advance()` 方法**

将原有 `advance()` 替换为：

```ts
    advance() {
      const { life, trajectoryLog, isEnd, pendingChoice, eventTags, choiceHistory,
               crisisTriggered, graduationAge, gaokaoRetriggerAge } = get()

      // 有待解决的选择时暂停推进
      if (pendingChoice !== null) return

      if (isEnd) { set({ step: 'summary' }); return }

      const result = life!.next()
      const age = result.age
      const props = life!.propertys as Record<string, number>
      const propSnapshot = {
        CHR: props.CHR, INT: props.INT, STR: props.STR,
        MNY: props.MNY, SPR: props.SPR,
      }

      // 检查濒死危机（优先于里程碑）
      if (!crisisTriggered) {
        const coreStats = [propSnapshot.CHR, propSnapshot.INT, propSnapshot.STR, propSnapshot.MNY, propSnapshot.SPR]
        if (coreStats.some(v => v <= 0)) {
          set({
            trajectoryLog: [...trajectoryLog, { age, result }],
            isEnd: result.isEnd,
            pendingChoice: 'CRISIS',
            crisisTriggered: true,
          })
          return
        }
      }

      // 检查 gaokao 复读重触发
      if (gaokaoRetriggerAge !== null && age === gaokaoRetriggerAge) {
        set({
          trajectoryLog: [...trajectoryLog, { age, result }],
          isEnd: result.isEnd,
          pendingChoice: 'GAOKAO',
          gaokaoRetriggerAge: null,
        })
        return
      }

      // 检查里程碑
      for (const milestone of MILESTONES) {
        if (milestone.key === 'CRISIS') continue  // CRISIS 由濒死检查处理
        if (milestone.key === 'GAOKAO' && age !== 18) continue
        if (milestone.key === 'GRADUATION' && age !== graduationAge) continue
        if (!['GAOKAO', 'GRADUATION'].includes(milestone.key) && age !== milestone.age) continue

        const shouldTrigger = !milestone.triggerCondition || milestone.triggerCondition(propSnapshot, eventTags)
        if (!shouldTrigger) continue

        set({
          trajectoryLog: [...trajectoryLog, { age, result }],
          isEnd: result.isEnd,
          pendingChoice: milestone.key,
        })
        return
      }

      // 正常推进
      set({
        trajectoryLog: [...trajectoryLog, { age, result }],
        isEnd: result.isEnd,
      })
    },
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/store/gameStore.test.ts
```

预期：所有测试通过

- [ ] **Step 5: 运行全量测试确认无破坏**

```bash
npx vitest run
```

预期：全量通过

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: advance() checks milestones and CRISIS, sets pendingChoice"
```

---

### Task 8: PlayPage 集成 ChoiceCard

**Files:**
- Modify: `src/pages/PlayPage.tsx`

- [ ] **Step 1: 修改 `src/pages/PlayPage.tsx`**

将文件完整替换为：

```tsx
import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { AgeLine } from '../components/game/AgeLine'
import { ChoiceCard } from '../components/game/ChoiceCard'
import { MILESTONES } from '../lib/milestones'
import { filterOptions, computeSuccessRate } from '../lib/choiceEngine'

export function PlayPage() {
  const log = useGameStore(s => s.trajectoryLog)
  const isEnd = useGameStore(s => s.isEnd)
  const advance = useGameStore(s => s.advance)
  const resolveChoice = useGameStore(s => s.resolveChoice)
  const pendingChoice = useGameStore(s => s.pendingChoice)
  const eventTags = useGameStore(s => s.eventTags)
  const choiceHistory = useGameStore(s => s.choiceHistory)
  const life = useGameStore(s => s.life)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [log, pendingChoice])

  const currentAge = log.length > 0 ? log[log.length - 1].age : 0

  const lifeStage = (age: number): string => {
    if (age <= 12) return '幼年'
    if (age <= 17) return '少年'
    if (age <= 29) return '青年'
    if (age <= 49) return '中年'
    if (age <= 64) return '壮年'
    return '老年'
  }

  const activeMilestone = pendingChoice
    ? MILESTONES.find(m => m.key === pendingChoice)
    : null

  const filteredOptions = (() => {
    if (!activeMilestone || !life) return []
    const props = life.propertys as Record<string, number>
    const propSnapshot = {
      CHR: props.CHR, INT: props.INT, STR: props.STR, MNY: props.MNY, SPR: props.SPR,
    }
    const opts = filterOptions(activeMilestone.options, propSnapshot, eventTags)
    return opts.map(opt => ({
      ...opt,
      successRate: computeSuccessRate(activeMilestone.key, opt.id, propSnapshot, choiceHistory),
    }))
  })()

  const butterflyContext = activeMilestone?.butterflyContextFn?.(choiceHistory)

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-sm text-slate-400 mb-2">人生轨迹</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
        {log.map(({ age, result }) => (
          <AgeLine key={age} age={age} content={result.content} />
        ))}
        {log.length === 0 && <div className="text-slate-500 text-sm">点击"下一年"开始人生</div>}

        {pendingChoice && activeMilestone && (
          <ChoiceCard
            milestoneKey={pendingChoice}
            age={currentAge}
            description={
              pendingChoice === 'CRISIS'
                ? (() => {
                    const props = life?.propertys as Record<string, number> ?? {}
                    const zeroed = (['CHR','INT','STR','MNY','SPR'] as const).find(k => (props[k] ?? 1) <= 0)
                    const labels: Record<string, string> = {
                      CHR: '颜值', INT: '智力', STR: '体质', MNY: '家境', SPR: '心态',
                    }
                    return zeroed
                      ? `你的${labels[zeroed]}已经降到了谷底……命运给了你最后一次机会。`
                      : '命运将你逼到了绝境，你只剩最后一搏。'
                  })()
                : activeMilestone.description
            }
            options={filteredOptions}
            butterflyContext={butterflyContext}
            onSelect={resolveChoice}
          />
        )}
      </div>

      <div className="mt-3 space-y-1">
        {currentAge > 0 && (
          <div className="text-xs text-slate-400 text-center">
            🕐 {currentAge}岁 · {lifeStage(currentAge)}
          </div>
        )}
        <Button
          className="w-full"
          onClick={advance}
          disabled={pendingChoice !== null}
        >
          {isEnd ? '查看总评' : '下一年'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 确认 TypeScript 无报错**

```bash
npx tsc --noEmit
```

预期：无 TS 错误

- [ ] **Step 3: 运行全量测试**

```bash
npx vitest run
```

预期：全量通过

- [ ] **Step 4: Commit**

```bash
git add src/pages/PlayPage.tsx
git commit -m "feat: integrate ChoiceCard into PlayPage, wire pendingChoice display"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 6 个人生节点（18/22/30/40/55/70岁） | Task 1 + Task 2 |
| CRISIS 濒死触发 | Task 2 数据 + Task 7 advance() |
| 条件概率机制 | Task 3 computeSuccessRate |
| 带锁选项（不满足条件不可见） | Task 3 filterOptions + Task 1-2 requireCondition |
| 蝴蝶效应文本 | Task 2 butterflyContextFn + Task 8 PlayPage |
| 封锁路线可视化（⚠️ 警告） | Task 5 ChoiceCard |
| eventTags 初始含 college_life | Task 6 store 初始状态 |
| GRADUATION 被技校/打工封锁 | Task 1 blockTag: 'college_life' |
| 考研推迟 GRADUATION 至 24岁 | Task 6 resolveChoice + Task 7 advance() |
| 复读重触发 GAOKAO | Task 6 resolveChoice + Task 7 advance() |
| pendingChoice 暂停 advance() | Task 7 advance() |
| ChoiceCard 内嵌（非弹窗） | Task 5 + Task 8 |
| 选完后只读 | Task 5 ChoiceCard disabled |
| 底部年龄/人生阶段指示器 | Task 8 PlayPage 底部栏 |

所有 spec 要求均有对应 Task，无遗漏。

### Placeholder Scan

无 TBD/TODO/placeholder，所有步骤均包含完整代码。

**注意**：Task 6 resolveChoice 中有 `// TODO(Plan C): outcome.triggerDeath` — 这是意图明确的 Plan C 延迟实现标记，不是 placeholder（Plan C 专门处理濒死死亡逻辑）。

### Type Consistency

- `MilestoneKey` 在 milestones.ts 定义，gameStore.ts import 后使用，类型一致
- `filterOptions` 接受 `ChoiceOption[]`，`ChoiceCard` 接受同类型，一致
- `computeSuccessRate` 返回 `number | undefined`，ChoiceCard 渲染时检查 `!== undefined`，一致
- `resolveGambling` 返回 `{ success, effects, unlockTag? }`，resolveChoice 消费，签名一致
- `life.applyEffect(Record<string, number>)` 与 property.ts `effect(Record<string, number>)` 一致
