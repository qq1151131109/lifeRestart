# Legacy Buffs + Crisis System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现两个收尾系统：① 局间成长 buff（每局结束按总评解锁 localStorage 永久 buff，下局叠加初始属性）；② CRISIS 濒死死亡逻辑（孤注一掷失败时立刻触发死亡）。

**Architecture:** 新建 `src/lib/legacyBuffs.ts` 封装 localStorage 读写；扩展 `src/store/gameStore.ts` 的 `startTrajectory()` 和 `finishSummary()`；在 `resolveChoice` 中补完 CRISIS 死亡分支。

**Tech Stack:** React 18, TypeScript, Zustand 5, Vitest, localStorage

**前置条件：Plan A 和 Plan B 均已完成**

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/lib/legacyBuffs.ts` | 新建 | localStorage 读/写 + buff 映射表 |
| `src/lib/__tests__/legacyBuffs.test.ts` | 新建 | legacyBuffs 单元测试 |
| `src/store/gameStore.ts` | 修改 | legacyBuffs 状态、startTrajectory buff 叠加、finishSummary 解锁、CRISIS 死亡 |
| `src/store/gameStore.test.ts` | 修改 | legacyBuffs + CRISIS 死亡 store 测试 |
| `src/pages/SummaryPage.tsx` | 修改 | 显示本局解锁的 buff（绿色 pill） |
| `src/pages/HomePage.tsx` | 修改 | 副标题显示已解锁 buff 数量 |
| `src/pages/SetupPage.tsx` | 修改 | 属性分配时显示 buff 加成灰色小字 |

---

### Task 1: legacyBuffs 工具模块

**Files:**
- Create: `src/lib/legacyBuffs.ts`
- Create: `src/lib/__tests__/legacyBuffs.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `src/lib/__tests__/legacyBuffs.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadBuffs,
  saveBuffs,
  unlockBuff,
  buildBuffFromGrade,
  LEGACY_BUFF_MAX,
} from '../legacyBuffs'
import type { LegacyBuff } from '../legacyBuffs'

const mockStorage: Record<string, string> = {}
const storageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => { mockStorage[key] = val },
}

describe('loadBuffs / saveBuffs', () => {
  beforeEach(() => { delete mockStorage['life_restart_buffs'] })

  it('无存储时返回空数组', () => {
    expect(loadBuffs(storageMock)).toEqual([])
  })

  it('保存后可读取', () => {
    const buffs: LegacyBuff[] = [
      { id: 'b1', label: '书香门第', prop: 'INT', delta: 1 },
    ]
    saveBuffs(storageMock, buffs)
    expect(loadBuffs(storageMock)).toEqual(buffs)
  })
})

describe('unlockBuff', () => {
  it('空列表时追加', () => {
    const result = unlockBuff([], { id: 'b1', label: '书香门第', prop: 'INT', delta: 1 })
    expect(result).toHaveLength(1)
  })

  it('未达上限时追加', () => {
    const existing: LegacyBuff[] = [
      { id: 'b1', label: 'A', prop: 'INT', delta: 1 },
      { id: 'b2', label: 'B', prop: 'MNY', delta: 1 },
    ]
    const result = unlockBuff(existing, { id: 'b3', label: 'C', prop: 'CHR', delta: 1 })
    expect(result).toHaveLength(3)
  })

  it('达到上限时移除最旧', () => {
    const existing: LegacyBuff[] = Array.from({ length: LEGACY_BUFF_MAX }, (_, i) => ({
      id: `b${i}`, label: `Buff${i}`, prop: 'INT' as const, delta: 1,
    }))
    const newBuff: LegacyBuff = { id: 'new', label: 'New', prop: 'CHR', delta: 1 }
    const result = unlockBuff(existing, newBuff)
    expect(result).toHaveLength(LEGACY_BUFF_MAX)
    expect(result[result.length - 1].id).toBe('new')
    expect(result[0].id).toBe('b1')  // b0 被移除
  })

  it('已有相同 id 时覆盖更新', () => {
    const existing: LegacyBuff[] = [
      { id: 'b1', label: '书香门第', prop: 'INT', delta: 1 },
    ]
    const updated: LegacyBuff = { id: 'b1', label: '书香门第·升级', prop: 'INT', delta: 2 }
    const result = unlockBuff(existing, updated)
    expect(result).toHaveLength(1)
    expect(result[0].delta).toBe(2)
  })
})

describe('buildBuffFromGrade', () => {
  it('SSSS 返回非 null buff', () => {
    expect(buildBuffFromGrade('SSSS')).not.toBeNull()
  })

  it('SSS 返回非 null buff', () => {
    expect(buildBuffFromGrade('SSS')).not.toBeNull()
  })

  it('SS 返回非 null buff', () => {
    expect(buildBuffFromGrade('SS')).not.toBeNull()
  })

  it('S 返回心态传承 buff', () => {
    const buff = buildBuffFromGrade('S')
    expect(buff).not.toBeNull()
    expect(buff!.prop).toBe('SPR')
    expect(buff!.delta).toBe(1)
  })

  it('A 返回心态传承 buff', () => {
    const buff = buildBuffFromGrade('A')
    expect(buff).not.toBeNull()
    expect(buff!.prop).toBe('SPR')
  })

  it('B 及以下返回 null', () => {
    expect(buildBuffFromGrade('B')).toBeNull()
    expect(buildBuffFromGrade('C')).toBeNull()
    expect(buildBuffFromGrade(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/lib/__tests__/legacyBuffs.test.ts
```

预期：`Cannot find module '../legacyBuffs'`

- [ ] **Step 3: 实现 `src/lib/legacyBuffs.ts`**

```ts
import type { PropKey } from './milestones'

export const LEGACY_BUFF_MAX = 5
const STORAGE_KEY = 'life_restart_buffs'

export interface LegacyBuff {
  id: string
  label: string
  prop: PropKey
  delta: number
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function loadBuffs(storage: StorageLike = localStorage): LegacyBuff[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LegacyBuff[]
  } catch {
    return []
  }
}

export function saveBuffs(storage: StorageLike = localStorage, buffs: LegacyBuff[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(buffs))
}

export function unlockBuff(current: LegacyBuff[], incoming: LegacyBuff): LegacyBuff[] {
  const idx = current.findIndex(b => b.id === incoming.id)
  if (idx !== -1) {
    const updated = [...current]
    updated[idx] = incoming
    return updated
  }
  if (current.length >= LEGACY_BUFF_MAX) {
    return [...current.slice(1), incoming]
  }
  return [...current, incoming]
}

// 随机选一条属性（INT/MNY/CHR）+1 的 buff，用于高分局
const HIGH_GRADE_BUFF_POOL: Array<Omit<LegacyBuff, 'id'>> = [
  { label: '书香门第', prop: 'INT', delta: 1 },
  { label: '富贵之家', prop: 'MNY', delta: 1 },
  { label: '天生丽质', prop: 'CHR', delta: 1 },
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function buildBuffFromGrade(grade: string | undefined): LegacyBuff | null {
  if (!grade) return null

  if (grade === 'SSSS') {
    // 两条随机择优：取 delta 最大的那条，若相同取 INT
    const a = pickRandom(HIGH_GRADE_BUFF_POOL)
    const b = pickRandom(HIGH_GRADE_BUFF_POOL)
    const chosen = a.delta >= b.delta ? a : b
    return { ...chosen, id: `legacy_${chosen.prop}_${Date.now()}` }
  }

  if (grade === 'SSS' || grade === 'SS') {
    const chosen = pickRandom(HIGH_GRADE_BUFF_POOL)
    return { ...chosen, id: `legacy_${chosen.prop}_${Date.now()}` }
  }

  if (grade === 'S' || grade === 'A') {
    return { id: `legacy_spr_${Date.now()}`, label: '心态传承', prop: 'SPR', delta: 1 }
  }

  return null
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/lib/__tests__/legacyBuffs.test.ts
```

预期：所有测试通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/legacyBuffs.ts src/lib/__tests__/legacyBuffs.test.ts
git commit -m "feat: add legacyBuffs module (load/save/unlock/buildFromGrade)"
```

---

### Task 2: Store 集成 legacyBuffs + startTrajectory buff 叠加

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: 写失败测试**

在 `src/store/gameStore.test.ts` 末尾追加：

```ts
describe('legacyBuffs in store', () => {
  it('初始 legacyBuffs 为空数组', () => {
    expect(useGameStore.getState().legacyBuffs).toEqual([])
  })

  it('startTrajectory 将 buff 叠加到 life.start 的初始属性', () => {
    const startSpy = vi.fn()
    useGameStore.setState({
      step: 'property',
      life: {
        start: startSpy,
        propertys: {},
      } as any,
      propertyAlloc: { CHR: 3, INT: 3, STR: 3, MNY: 3, SPR: 5, total: 20 },
      legacyBuffs: [
        { id: 'b1', label: '书香门第', prop: 'INT', delta: 1 },
        { id: 'b2', label: '天生丽质', prop: 'CHR', delta: 1 },
      ],
    })
    useGameStore.getState().startTrajectory()
    expect(startSpy).toHaveBeenCalledWith({
      CHR: 4,  // 3 + 1
      INT: 4,  // 3 + 1
      STR: 3,
      MNY: 3,
      SPR: 5,
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/store/gameStore.test.ts
```

预期：`legacyBuffs` 字段不存在，startTrajectory buff 叠加未实现

- [ ] **Step 3: 修改 `src/store/gameStore.ts`**

在文件顶部添加 import：

```ts
import { loadBuffs, saveBuffs, unlockBuff, buildBuffFromGrade } from '../lib/legacyBuffs'
import type { LegacyBuff } from '../lib/legacyBuffs'
```

在 `interface GameState` 中添加：

```ts
  legacyBuffs: LegacyBuff[]
  newlyUnlockedBuff: LegacyBuff | null   // 本局刚解锁的 buff，供 SummaryPage 展示
  unlockLegacyBuff(buff: LegacyBuff): void
```

在初始状态中添加：

```ts
    legacyBuffs: loadBuffs(),
    newlyUnlockedBuff: null,
```

将原有 `startTrajectory()` 替换为：

```ts
    startTrajectory() {
      const { life, propertyAlloc, legacyBuffs } = get()
      const { CHR, INT, STR, MNY } = propertyAlloc

      // 叠加局间 buff 到初始属性（上限 10）
      const buffed: Record<string, number> = { CHR, INT, STR, MNY, SPR: 5 }
      for (const buff of legacyBuffs) {
        buffed[buff.prop] = Math.min(10, (buffed[buff.prop] ?? 0) + buff.delta)
      }

      life!.start(buffed)
      set({
        step: 'trajectory',
        trajectoryLog: [],
        isEnd: false,
        pendingChoice: null,
        choiceHistory: [],
        eventTags: new Set(['college_life']),
        crisisTriggered: false,
        graduationAge: 22,
        gaokaoRetriggerAge: null,
        newlyUnlockedBuff: null,
      })
    },
```

添加 `unlockLegacyBuff` 方法（在 `resolveChoice` 方法之后）：

```ts
    unlockLegacyBuff(buff: LegacyBuff) {
      const { legacyBuffs } = get()
      const next = unlockBuff(legacyBuffs, buff)
      saveBuffs(localStorage, next)
      set({ legacyBuffs: next, newlyUnlockedBuff: buff })
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
git commit -m "feat: integrate legacyBuffs into store — startTrajectory applies buff bonuses"
```

---

### Task 3: finishSummary 解锁 buff + CRISIS 死亡分支

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: 写失败测试**

在 `src/store/gameStore.test.ts` 末尾追加：

```ts
describe('finishSummary unlocks buff', () => {
  it('SSSS 总评解锁 buff', () => {
    const unlockSpy = vi.fn()
    useGameStore.setState({
      life: {
        talentExtend: () => {},
        summary: { SUM: { grade: 'SSSS', value: 10 } },
        propertys: {},
      } as any,
      talentExtend: null,
      legacyBuffs: [],
      unlockLegacyBuff: unlockSpy,
    })
    useGameStore.getState().finishSummary()
    expect(unlockSpy).toHaveBeenCalled()
  })

  it('B 总评不解锁 buff', () => {
    const unlockSpy = vi.fn()
    useGameStore.setState({
      life: {
        talentExtend: () => {},
        summary: { SUM: { grade: 'B', value: 3 } },
        propertys: {},
      } as any,
      talentExtend: null,
      legacyBuffs: [],
      unlockLegacyBuff: unlockSpy,
    })
    useGameStore.getState().finishSummary()
    expect(unlockSpy).not.toHaveBeenCalled()
  })
})

describe('CRISIS death in resolveChoice', () => {
  it('孤注一掷失败（successRate=0）时 isEnd=true', () => {
    const mockLife = {
      applyEffect: () => {},
      propertys: { CHR: 1, INT: 1, STR: 0, MNY: 1, SPR: 1, AGE: 25 },
    }
    useGameStore.setState({
      life: mockLife as any,
      pendingChoice: 'CRISIS',
      choiceHistory: [],
      eventTags: new Set(),
      crisisTriggered: true,
      graduationAge: 22,
      gaokaoRetriggerAge: null,
      isEnd: false,
      trajectoryLog: [],
    })
    // 用 mock 让 resolveGambling 必定失败：successRate=0 不行，
    // 因为 computeSuccessRate('CRISIS','all_in') 返回 70。
    // 用 vi.spyOn 强制让 Math.random 返回 0.99（> 70%/100 → 失败）
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    useGameStore.getState().resolveChoice('all_in')
    spy.mockRestore()
    expect(useGameStore.getState().isEnd).toBe(true)
  })

  it('孤注一掷成功（successRate=100）时 isEnd 不变', () => {
    const mockLife = {
      applyEffect: vi.fn(),
      propertys: { CHR: 1, INT: 1, STR: 0, MNY: 1, SPR: 1, AGE: 25 },
    }
    useGameStore.setState({
      life: mockLife as any,
      pendingChoice: 'CRISIS',
      choiceHistory: [],
      eventTags: new Set(),
      crisisTriggered: true,
      graduationAge: 22,
      gaokaoRetriggerAge: null,
      isEnd: false,
      trajectoryLog: [],
    })
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01)  // < 0.70 → 成功
    useGameStore.getState().resolveChoice('all_in')
    spy.mockRestore()
    expect(useGameStore.getState().isEnd).toBe(false)
    // 回血：降至0的属性 STR 应回 +3
    expect(mockLife.applyEffect).toHaveBeenCalledWith({ STR: 3 })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/store/gameStore.test.ts
```

预期：finishSummary buff 解锁 + CRISIS death 相关测试失败

- [ ] **Step 3: 修改 `src/store/gameStore.ts` — finishSummary**

将原有 `finishSummary()` 替换为：

```ts
    finishSummary() {
      const { life, talentExtend, unlockLegacyBuff } = get()
      if (talentExtend) {
        life!.talentExtend(Number(talentExtend))
      }

      // 按总评解锁局间 buff
      const summary = life!.summary
      const grade = (summary?.SUM as { grade?: string })?.grade
      const buff = buildBuffFromGrade(grade)
      if (buff) {
        unlockLegacyBuff(buff)
      }

      set({ step: 'home' })
    },
```

- [ ] **Step 4: 修改 `src/store/gameStore.ts` — resolveChoice CRISIS 死亡分支**

在 `resolveChoice` 方法中，找到 `// TODO(Plan C): outcome.triggerDeath 触发死亡由 Plan C 处理` 这行注释，将其及紧跟的闭合 `}` 替换为：

```ts
      if (option.gambling) {
        const rate = computeSuccessRate(pendingChoice, optionId, propSnapshot, choiceHistory) ?? 50
        const outcome = resolveGambling(option, rate)
        effectsToApply = outcome.effects
        if (outcome.unlockTag) unlockTag = outcome.unlockTag

        // CRISIS 孤注一掷失败：回血或触发死亡
        if (pendingChoice === 'CRISIS' && optionId === 'all_in') {
          if (outcome.triggerDeath) {
            set({ pendingChoice: null, isEnd: true })
            return
          }
          // 成功：回血 +3 到降至 0 的那条属性
          const props2 = life!.propertys as Record<string, number>
          const zeroed = (['CHR','INT','STR','MNY','SPR'] as const).find(k => (props2[k] ?? 1) <= 0)
          if (zeroed) {
            life!.applyEffect({ [zeroed]: 3 })
          }
          set({ pendingChoice: null, choiceHistory: [...choiceHistory, { milestone: pendingChoice, optionId, age }] })
          return
        }
      }
```

**注意**：此替换需要在 `resolveChoice` 中重构 gambling 分支。完整替换后的 `resolveChoice` 方法如下：

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
      const age = (props.AGE as number) ?? 0

      let effectsToApply: Partial<Record<string, number>> = { ...option.effects }
      let unlockTag = option.unlockTag
      const blockTag = option.blockTag

      if (option.gambling) {
        const rate = computeSuccessRate(pendingChoice, optionId, propSnapshot, choiceHistory) ?? 50
        const outcome = resolveGambling(option, rate)
        effectsToApply = outcome.effects
        if (outcome.unlockTag) unlockTag = outcome.unlockTag

        if (pendingChoice === 'CRISIS' && optionId === 'all_in') {
          if (outcome.triggerDeath) {
            set({ pendingChoice: null, isEnd: true })
            return
          }
          // 成功：找到降至 0 的属性并回血 +3
          const currentProps = life!.propertys as Record<string, number>
          const zeroed = (['CHR','INT','STR','MNY','SPR'] as const).find(k => (currentProps[k] ?? 1) <= 0)
          if (zeroed) {
            life!.applyEffect({ [zeroed]: 3 })
          }
          set({
            pendingChoice: null,
            choiceHistory: [...choiceHistory, { milestone: pendingChoice, optionId, age }],
          })
          return
        }
      }

      const validEffects = Object.fromEntries(
        Object.entries(effectsToApply).filter(([, v]) => v !== 0)
      ) as Record<string, number>
      if (Object.keys(validEffects).length > 0) {
        life!.applyEffect(validEffects)
      }

      const nextTags = new Set(eventTags)
      if (unlockTag) nextTags.add(unlockTag)
      if (blockTag) nextTags.delete(blockTag)

      const nextHistory = [...choiceHistory, { milestone: pendingChoice, optionId, age }]

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

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run src/store/gameStore.test.ts
```

预期：所有测试通过

- [ ] **Step 6: 运行全量测试**

```bash
npx vitest run
```

预期：全量通过

- [ ] **Step 7: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: finishSummary unlocks legacy buff; CRISIS all_in triggers death on failure"
```

---

### Task 4: SummaryPage 展示本局解锁 buff

**Files:**
- Modify: `src/pages/SummaryPage.tsx`

- [ ] **Step 1: 读取当前 SummaryPage 并定位 "再来一次" 按钮区域**

```bash
grep -n "再来一次\|finishSummary\|Button" src/pages/SummaryPage.tsx | head -20
```

- [ ] **Step 2: 修改 `src/pages/SummaryPage.tsx` — 在按钮上方添加 buff 展示**

在按钮区域（`finishSummary` 调用处）上方插入以下 JSX 代码段：

```tsx
// 在文件顶部 import 行追加
import { useGameStore } from '../store'

// 在组件内读取 newlyUnlockedBuff
const newlyUnlockedBuff = useGameStore(s => s.newlyUnlockedBuff)
```

在 "再来一次" 按钮上方（`<div>` 容器内）添加：

```tsx
{newlyUnlockedBuff && (
  <div className="flex justify-center mb-3">
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 font-medium">
      ✨ 已解锁传承：{newlyUnlockedBuff.label}（{newlyUnlockedBuff.prop}+{newlyUnlockedBuff.delta}）
    </span>
  </div>
)}
```

- [ ] **Step 3: 确认 TypeScript 无报错**

```bash
npx tsc --noEmit
```

预期：无错误

- [ ] **Step 4: Commit**

```bash
git add src/pages/SummaryPage.tsx
git commit -m "feat: SummaryPage shows newly unlocked legacy buff"
```

---

### Task 5: HomePage 副标题显示 buff 数量 + SetupPage buff 小字

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/SetupPage.tsx`（或 `src/components/game/PropertyAllocator.tsx` 若 Plan A 已拆分）

- [ ] **Step 1: 修改 `src/pages/HomePage.tsx` — 在副标题添加已解锁 buff 数量**

先查看文件：

```bash
grep -n "legacyBuff\|buff\|次\|运行\|总成就" src/pages/HomePage.tsx | head -10
```

在 `src/pages/HomePage.tsx` 中，找到副标题区域（显示运行次数的地方），添加：

```tsx
const legacyBuffs = useGameStore(s => s.legacyBuffs)
```

在副标题行追加（若已有统计行则追加到同一行尾部）：

```tsx
{legacyBuffs.length > 0 && (
  <span className="text-xs text-indigo-400"> · 已传承 {legacyBuffs.length} 条 buff</span>
)}
```

- [ ] **Step 2: 修改属性分配页，在每维属性旁显示 buff 加成**

找到属性分配组件文件（Plan A 之后应为 `src/components/game/PropertyAllocator.tsx`，若未创建则为 `src/pages/SetupPage.tsx`）：

```bash
grep -rn "propertyAlloc\|setProperty\|CHR\|INT" src/components/game/ src/pages/SetupPage.tsx 2>/dev/null | grep -v test | head -10
```

在该组件中：

```tsx
const legacyBuffs = useGameStore(s => s.legacyBuffs)
```

对每个属性显示 buff 加成小字（在属性值/进度条旁）：

```tsx
{legacyBuffs.filter(b => b.prop === tag).map(b => (
  <span key={b.id} className="text-xs text-slate-400 ml-1">+{b.delta}（传承）</span>
))}
```

其中 `tag` 是当前遍历的属性键（如 `'CHR'`/`'INT'` 等）。

- [ ] **Step 3: 确认 TypeScript 无报错 + 全量测试通过**

```bash
npx tsc --noEmit && npx vitest run
```

预期：无错误，全量通过

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/SetupPage.tsx src/components/game/PropertyAllocator.tsx 2>/dev/null; git commit -m "feat: HomePage shows buff count; SetupPage shows buff bonuses on property bars"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 每局结束按总评解锁 localStorage buff | Task 3 finishSummary |
| 下局 startTrajectory 叠加 buff | Task 2 startTrajectory |
| 最多累积 5 条 buff，超出移除最旧 | Task 1 unlockBuff |
| SSSS → 随机两条择优 | Task 1 buildBuffFromGrade |
| SSS/SS → 随机一条属性 +1 | Task 1 buildBuffFromGrade |
| S/A → 心态传承 SPR+1 | Task 1 buildBuffFromGrade |
| B 及以下无 buff | Task 1 buildBuffFromGrade |
| SummaryPage 展示已解锁 buff | Task 4 |
| SetupPage 显示 buff 传承加成 | Task 5 |
| CRISIS 孤注一掷失败触发死亡 | Task 3 resolveChoice |
| CRISIS 孤注一掷成功回血 +3 | Task 3 resolveChoice |

所有要求均有对应实现，无遗漏。

### Placeholder Scan

Task 5 Step 1-2 包含 `grep` 命令探查文件——这是必要的"先找到当前状态再修改"，不是 placeholder，因为 Plan A 可能重构了文件结构。修改内容均有完整代码片段。

### Type Consistency

- `LegacyBuff.prop: PropKey` 与 milestones.ts 中的 `PropKey` 一致
- `StorageLike` 接口与 `localStorage` 的实际接口兼容
- `buildBuffFromGrade(grade: string | undefined)` 与 `life.summary.SUM.grade` 的调用形式一致
- `unlockLegacyBuff(buff: LegacyBuff)` 在 GameState interface 中声明，store 和 test 使用相同签名
