# 结局海报分享 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SummaryPage 添加「分享海报」按钮，生成一张复古羊皮纸风格竖版（9:16）海报图片，用户可长按保存或点击下载。

**Architecture:** 纯展示组件 `PosterCard` 隐藏渲染于页面外，`usePosterExport` hook 用 html2canvas 捕获为 dataURL，`PosterModal` 弹层展示 `<img>` 供长按保存，附下载按钮；戏剧性事件选取逻辑抽为纯函数 `selectDramaticEvents`，便于测试。

**Tech Stack:** React 18 + TypeScript + html2canvas + Vitest + @testing-library/react

---

## File Map

| 操作 | 文件 | 职责 |
|------|------|------|
| Create | `src/components/poster/posterUtils.ts` | 纯函数：事件筛选排序 |
| Create | `src/components/poster/posterUtils.test.ts` | posterUtils 单测 |
| Create | `src/components/poster/PosterCard.tsx` | 海报 DOM 布局（固定 360×640，内联样式） |
| Create | `src/components/poster/PosterCard.test.tsx` | PosterCard 渲染单测 |
| Create | `src/hooks/usePosterExport.ts` | html2canvas → dataURL hook |
| Create | `src/hooks/usePosterExport.test.ts` | hook 状态单测（mock html2canvas） |
| Create | `src/components/poster/PosterModal.tsx` | 弹层：img + 下载 + 换一条 |
| Create | `src/components/poster/PosterModal.test.tsx` | PosterModal 交互单测 |
| Modify | `src/pages/SummaryPage.tsx` | 加分享按钮 + 隐藏 PosterCard + 弹层状态 |

---

## Task 1: 安装 html2canvas

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd /data/shenglin/lifeRestart
pnpm add html2canvas
pnpm add -D @types/html2canvas
```

- [ ] **Step 2: 验证安装**

```bash
node -e "import('html2canvas').then(m => console.log('ok:', typeof m.default))"
```

Expected output: `ok: function`

- [ ] **Step 3: 提交**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add html2canvas dependency"
```

---

## Task 2: posterUtils — 戏剧性事件筛选纯函数

**Files:**
- Create: `src/components/poster/posterUtils.ts`
- Create: `src/components/poster/posterUtils.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `src/components/poster/posterUtils.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { selectDramaticEvents } from './posterUtils'
import type { NextResult } from '@/core/types'

function makeLog(entries: Array<{ age: number; contents: Array<{ type: 'TLT' | 'EVT'; description: string; grade?: number }> }>) {
  return entries.map(e => ({
    age: e.age,
    result: {
      age: e.age,
      content: e.contents as NextResult['content'],
      isEnd: false,
    } as NextResult,
  }))
}

describe('selectDramaticEvents', () => {
  it('returns empty array when no EVT entries', () => {
    const log = makeLog([{ age: 1, contents: [{ type: 'TLT', description: 'x' }] }])
    expect(selectDramaticEvents(log)).toEqual([])
  })

  it('filters only EVT entries', () => {
    const log = makeLog([{
      age: 5,
      contents: [
        { type: 'TLT', description: 'talent' },
        { type: 'EVT', description: 'event', grade: 1 },
      ],
    }])
    const result = selectDramaticEvents(log)
    expect(result).toHaveLength(1)
    expect(result[0].content.description).toBe('event')
    expect(result[0].age).toBe(5)
  })

  it('sorts by grade descending', () => {
    const log = makeLog([
      { age: 1, contents: [{ type: 'EVT', description: 'grade0', grade: 0 }] },
      { age: 2, contents: [{ type: 'EVT', description: 'grade3', grade: 3 }] },
      { age: 3, contents: [{ type: 'EVT', description: 'grade2', grade: 2 }] },
    ])
    const result = selectDramaticEvents(log)
    expect(result.map(e => e.content.description)).toEqual(['grade3', 'grade2', 'grade0'])
  })

  it('puts undefined grade last', () => {
    const log = makeLog([
      { age: 1, contents: [{ type: 'EVT', description: 'nograde' }] },
      { age: 2, contents: [{ type: 'EVT', description: 'grade1', grade: 1 }] },
    ])
    const result = selectDramaticEvents(log)
    expect(result.map(e => e.content.description)).toEqual(['grade1', 'nograde'])
  })

  it('collects EVTs from multiple content items in same entry', () => {
    const log = makeLog([{
      age: 10,
      contents: [
        { type: 'EVT', description: 'first', grade: 2 },
        { type: 'EVT', description: 'second', grade: 1 },
      ],
    }])
    expect(selectDramaticEvents(log)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|posterUtils"
```

Expected: FAIL 或 "Cannot find module"

- [ ] **Step 3: 实现 posterUtils.ts**

新建 `src/components/poster/posterUtils.ts`：

```ts
import type { NextResult, TrajectoryContent } from '@/core/types'

export interface DramaticEvent {
  age: number
  content: TrajectoryContent
}

function gradeRank(g: number | undefined): number {
  return g === undefined ? -1 : g
}

export function selectDramaticEvents(
  trajectoryLog: Array<{ age: number; result: NextResult }>
): DramaticEvent[] {
  const events: DramaticEvent[] = []
  for (const entry of trajectoryLog) {
    for (const c of entry.result.content) {
      if (c.type === 'EVT') {
        events.push({ age: entry.age, content: c })
      }
    }
  }
  return events.sort((a, b) => gradeRank(b.content.grade) - gradeRank(a.content.grade))
}
```

- [ ] **Step 4: 运行确认通过**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|✓|posterUtils"
```

Expected: 5 tests passing

- [ ] **Step 5: 提交**

```bash
git add src/components/poster/posterUtils.ts src/components/poster/posterUtils.test.ts
git commit -m "feat(poster): add selectDramaticEvents utility"
```

---

## Task 3: PosterCard — 海报 DOM 组件

**Files:**
- Create: `src/components/poster/PosterCard.tsx`
- Create: `src/components/poster/PosterCard.test.tsx`

- [ ] **Step 1: 写失败测试**

新建 `src/components/poster/PosterCard.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PosterCard } from './PosterCard'
import type { LifeSummary, TalentMeta } from '@/core/types'

const summary: LifeSummary = {
  HCHR: { prop: 'HCHR', value: 9, grade: 3, judge: 'UI_Judge_Level_5', progress: 90 },
  HINT: { prop: 'HINT', value: 0, grade: 0, judge: 'UI_Judge_Level_0', progress: 0 },
  HSTR: { prop: 'HSTR', value: 6, grade: 1, judge: 'UI_Judge_Level_3', progress: 60 },
  HMNY: { prop: 'HMNY', value: 5, grade: 1, judge: 'UI_Judge_Level_3', progress: 50 },
  HSPR: { prop: 'HSPR', value: 7, grade: 2, judge: 'UI_Judge_Level_4', progress: 70 },
  HAGE: { prop: 'HAGE', value: 23, grade: 1, judge: 'UI_AGE_Judge_Level_3', progress: 20 },
  SUM:  { prop: 'SUM',  value: 55, grade: 1, judge: 'UI_Judge_Level_2', progress: 55 },
}

const talents: TalentMeta[] = [
  { id: 1, name: '从心所欲', description: '', grade: 3 },
  { id: 2, name: '苦痛侍僧', description: '', grade: 2 },
]

describe('PosterCard', () => {
  it('renders age from summary.HAGE.value', () => {
    render(<PosterCard summary={summary} talents={talents} dramaticEvent="23岁 · 你考上了重点大学" />)
    expect(screen.getByText(/享年\s*23/)).toBeInTheDocument()
  })

  it('renders overall judge from summary.SUM.judge', () => {
    render(<PosterCard summary={summary} talents={talents} dramaticEvent="23岁 · 事件" />)
    expect(screen.getByText(/不佳/)).toBeInTheDocument()
  })

  it('renders all six property dimensions', () => {
    render(<PosterCard summary={summary} talents={talents} dramaticEvent="23岁 · 事件" />)
    expect(screen.getByText('颜值')).toBeInTheDocument()
    expect(screen.getByText('智力')).toBeInTheDocument()
    expect(screen.getByText('体质')).toBeInTheDocument()
    expect(screen.getByText('家境')).toBeInTheDocument()
    expect(screen.getByText('快乐')).toBeInTheDocument()
    expect(screen.getByText('享年')).toBeInTheDocument()
  })

  it('renders talent names', () => {
    render(<PosterCard summary={summary} talents={talents} dramaticEvent="23岁 · 事件" />)
    expect(screen.getByText('从心所欲')).toBeInTheDocument()
    expect(screen.getByText('苦痛侍僧')).toBeInTheDocument()
  })

  it('renders dramatic event text', () => {
    render(<PosterCard summary={summary} talents={talents} dramaticEvent="23岁 · 你考上了重点大学" />)
    expect(screen.getByText(/你考上了重点大学/)).toBeInTheDocument()
  })

  it('renders watermark', () => {
    render(<PosterCard summary={summary} talents={talents} dramaticEvent="23岁 · 事件" />)
    expect(screen.getByText(/syaro\.io/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|PosterCard"
```

- [ ] **Step 3: 实现 PosterCard.tsx**

新建 `src/components/poster/PosterCard.tsx`：

```tsx
import zh from '@/i18n/zh-cn'
import type { LifeSummary, TalentMeta } from '@/core/types'

interface PosterCardProps {
  summary: LifeSummary
  talents: TalentMeta[]
  dramaticEvent: string
}

const GRID_DIMS = [
  { label: '颜值', key: 'HCHR' },
  { label: '智力', key: 'HINT' },
  { label: '体质', key: 'HSTR' },
  { label: '家境', key: 'HMNY' },
  { label: '快乐', key: 'HSPR' },
  { label: '享年', key: 'HAGE' },
] as const

function gradeColor(g: number): string {
  const colors = ['#a8956a', '#4d7c0f', '#b45309', '#92400e']
  return colors[g] ?? '#a8956a'
}

export function PosterCard({ summary, talents, dramaticEvent }: PosterCardProps) {
  const age = summary.HAGE?.value ?? '?'
  const sumEntry = summary.SUM
  const overallJudge = sumEntry ? (zh[sumEntry.judge] ?? sumEntry.judge) : ''

  return (
    <div style={{
      width: '360px',
      height: '640px',
      background: '#fef9ef',
      border: '2px solid #e7d9c0',
      borderRadius: '12px',
      fontFamily: "'PingFang SC', 'Noto Serif SC', serif",
      color: '#1c1917',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 20px',
      boxSizing: 'border-box',
    }}>
      {/* 顶部标题 */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#a8956a', letterSpacing: '3px', marginBottom: '16px' }}>
        人生重开模拟器
      </div>

      {/* 享年 + 总评 */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#92400e' }}>享年 {age}岁</div>
        <div style={{ fontSize: '13px', color: '#a8956a', marginTop: '4px' }}>
          {sumEntry ? (zh[sumEntry.judge] ?? sumEntry.judge) : ''} · 总评 {overallJudge}
        </div>
      </div>

      {/* 6维属性网格 3列 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        {GRID_DIMS.map(({ label, key }) => {
          const d = summary[key]
          if (!d) return null
          return (
            <div key={key} style={{
              background: '#fdf3e3',
              border: '1px solid #e7d9c0',
              borderRadius: '8px',
              padding: '8px 4px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: '#7c5c3a', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{d.value}</div>
              <div style={{ fontSize: '10px', color: gradeColor(d.grade), marginTop: '2px' }}>
                {zh[d.judge] ?? d.judge}
              </div>
            </div>
          )
        })}
      </div>

      {/* SUM 单行居中 */}
      {sumEntry && (
        <div style={{
          background: '#fdf3e3',
          border: '1px solid #e7d9c0',
          borderRadius: '8px',
          padding: '8px',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '11px', color: '#7c5c3a', marginRight: '8px' }}>总评</span>
          <span style={{ fontSize: '18px', fontWeight: 700, marginRight: '6px' }}>{sumEntry.value}</span>
          <span style={{ fontSize: '10px', color: gradeColor(sumEntry.grade) }}>{zh[sumEntry.judge] ?? sumEntry.judge}</span>
        </div>
      )}

      {/* 天赋标签 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#a8956a', marginBottom: '6px' }}>天赋</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {talents.slice(0, 3).map(t => (
            <span key={t.id} style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '11px',
            }}>
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* 戏剧性事件引言 */}
      <div style={{ borderTop: '1px solid #e7d9c0', paddingTop: '12px', flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: '#7c5c3a', fontStyle: 'italic', lineHeight: 1.6 }}>
          "{dramaticEvent}"
        </div>
      </div>

      {/* 水印 */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#c4a97a', marginTop: '12px' }}>
        lifeRestart · syaro.io
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|✓|PosterCard"
```

Expected: 6 tests passing

- [ ] **Step 5: 提交**

```bash
git add src/components/poster/PosterCard.tsx src/components/poster/PosterCard.test.tsx
git commit -m "feat(poster): add PosterCard parchment-style component"
```

---

## Task 4: usePosterExport hook

**Files:**
- Create: `src/hooks/usePosterExport.ts`
- Create: `src/hooks/usePosterExport.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `src/hooks/usePosterExport.test.ts`：

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRef } from 'react'

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}))

import html2canvas from 'html2canvas'
import { usePosterExport } from './usePosterExport'

describe('usePosterExport', () => {
  beforeEach(() => {
    vi.mocked(html2canvas).mockReset()
  })

  it('starts with null dataUrl and not generating', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })
    expect(result.current.dataUrl).toBeNull()
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets isGenerating true while html2canvas runs', async () => {
    let resolve!: (v: HTMLCanvasElement) => void
    vi.mocked(html2canvas).mockReturnValue(new Promise(r => { resolve = r }))

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })

    act(() => { result.current.generate() })
    expect(result.current.isGenerating).toBe(true)

    const canvas = { toDataURL: () => 'data:image/png;base64,abc' } as HTMLCanvasElement
    await act(async () => { resolve(canvas) })
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.dataUrl).toBe('data:image/png;base64,abc')
  })

  it('sets error on html2canvas failure', async () => {
    vi.mocked(html2canvas).mockRejectedValue(new Error('canvas error'))

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })

    await act(async () => { await result.current.generate() })
    expect(result.current.dataUrl).toBeNull()
    expect(result.current.error).toBe('海报生成失败，请重试')
    expect(result.current.isGenerating).toBe(false)
  })

  it('clear resets dataUrl and error', async () => {
    vi.mocked(html2canvas).mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })

    await act(async () => { await result.current.generate() })
    expect(result.current.error).toBe('海报生成失败，请重试')

    act(() => { result.current.clear() })
    expect(result.current.error).toBeNull()
    expect(result.current.dataUrl).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|usePosterExport"
```

- [ ] **Step 3: 实现 usePosterExport.ts**

新建 `src/hooks/usePosterExport.ts`：

```ts
import { useState, useCallback } from 'react'
import type { RefObject } from 'react'

export function usePosterExport(cardRef: RefObject<HTMLDivElement>) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!cardRef.current) return
    setIsGenerating(true)
    setError(null)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true })
      setDataUrl(canvas.toDataURL('image/png'))
    } catch {
      setError('海报生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }, [cardRef])

  const clear = useCallback(() => {
    setDataUrl(null)
    setError(null)
  }, [])

  return { dataUrl, isGenerating, error, generate, clear }
}
```

- [ ] **Step 4: 运行确认通过**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|✓|usePosterExport"
```

Expected: 4 tests passing

- [ ] **Step 5: 提交**

```bash
git add src/hooks/usePosterExport.ts src/hooks/usePosterExport.test.ts
git commit -m "feat(poster): add usePosterExport hook"
```

---

## Task 5: PosterModal — 弹层组件

**Files:**
- Create: `src/components/poster/PosterModal.tsx`
- Create: `src/components/poster/PosterModal.test.tsx`

- [ ] **Step 1: 写失败测试**

新建 `src/components/poster/PosterModal.test.tsx`：

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PosterModal } from './PosterModal'

const baseProps = {
  dataUrl: 'data:image/png;base64,abc',
  onSwapEvent: vi.fn(),
  onClose: vi.fn(),
}

describe('PosterModal', () => {
  it('renders img with dataUrl as src', () => {
    render(<PosterModal {...baseProps} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc')
  })

  it('renders download link with correct href and filename', () => {
    render(<PosterModal {...baseProps} />)
    const link = screen.getByText('保存图片').closest('a')!
    expect(link).toHaveAttribute('href', 'data:image/png;base64,abc')
    expect(link).toHaveAttribute('download', 'life-poster.png')
  })

  it('calls onSwapEvent when 换一条事件 clicked', () => {
    const onSwapEvent = vi.fn()
    render(<PosterModal {...baseProps} onSwapEvent={onSwapEvent} />)
    fireEvent.click(screen.getByText('换一条事件'))
    expect(onSwapEvent).toHaveBeenCalledOnce()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<PosterModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay background clicked', () => {
    const onClose = vi.fn()
    render(<PosterModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('poster-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose when clicking inside content', () => {
    const onClose = vi.fn()
    render(<PosterModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('img'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find|PosterModal"
```

- [ ] **Step 3: 实现 PosterModal.tsx**

新建 `src/components/poster/PosterModal.tsx`：

```tsx
interface PosterModalProps {
  dataUrl: string
  onSwapEvent: () => void
  onClose: () => void
}

export function PosterModal({ dataUrl, onSwapEvent, onClose }: PosterModalProps) {
  return (
    <div
      data-testid="poster-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      {/* 关闭按钮 */}
      <button
        aria-label="关闭"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#fff',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* 内容区域，阻止冒泡到 overlay */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
      >
        <img
          src={dataUrl}
          alt="人生海报"
          style={{ maxHeight: '70vh', borderRadius: '8px', display: 'block' }}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onSwapEvent}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            换一条事件
          </button>

          <a
            href={dataUrl}
            download="life-poster.png"
            style={{
              background: '#fef3c7',
              color: '#92400e',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            保存图片
          </a>
        </div>

        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          长按图片可直接保存
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 运行确认通过**

```bash
pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|✓|PosterModal"
```

Expected: 6 tests passing

- [ ] **Step 5: 提交**

```bash
git add src/components/poster/PosterModal.tsx src/components/poster/PosterModal.test.tsx
git commit -m "feat(poster): add PosterModal component"
```

---

## Task 6: SummaryPage 集成

**Files:**
- Modify: `src/pages/SummaryPage.tsx`

> 此 task 为集成组件，不写新的单测（各组件已有充分覆盖）。手动在浏览器验证。

- [ ] **Step 1: 更新 SummaryPage.tsx**

完整替换 `src/pages/SummaryPage.tsx` 为：

```tsx
import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { SummaryTable } from '../components/game/SummaryTable'
import { TalentCard } from '../components/game/TalentCard'
import { PosterCard } from '../components/poster/PosterCard'
import { PosterModal } from '../components/poster/PosterModal'
import { usePosterExport } from '../hooks/usePosterExport'
import { selectDramaticEvents } from '../components/poster/posterUtils'
import type { LifeSummary } from '../core/types'

export function SummaryPage() {
  const life = useGameStore(s => s.life)
  const selectedTalents = useGameStore(s => s.selectedTalents)
  const randomTalents = useGameStore(s => s.randomTalents)
  const trajectoryLog = useGameStore(s => s.trajectoryLog)
  const talentExtend = useGameStore(s => s.talentExtend)
  const setTalentExtend = useGameStore(s => s.setTalentExtend)
  const finishSummary = useGameStore(s => s.finishSummary)

  const cardRef = useRef<HTMLDivElement>(null)
  const { dataUrl, isGenerating, error, generate, clear } = usePosterExport(cardRef)
  const [showModal, setShowModal] = useState(false)
  const [eventIndex, setEventIndex] = useState(0)

  const ownedTalents = randomTalents.filter(t => selectedTalents.has(String(t.id)))

  if (!life) return null

  const summary = life.summary as LifeSummary
  const dramaticEvents = selectDramaticEvents(trajectoryLog)
  const currentEvent = dramaticEvents[eventIndex]
  const dramaticEventText = currentEvent
    ? `${currentEvent.age}岁 · ${currentEvent.content.description}`
    : `${summary.HAGE?.value ?? '?'}岁 · 一生平淡，却也真实。`

  const handleSharePoster = useCallback(async () => {
    setEventIndex(0)
    await generate()
    setShowModal(true)
  }, [generate])

  const handleSwapEvent = useCallback(() => {
    if (dramaticEvents.length === 0) return
    setEventIndex(i => (i + 1) % dramaticEvents.length)
  }, [dramaticEvents.length])

  // 换一条事件后，PosterCard 内容已更新，重新生成海报图片
  useEffect(() => {
    if (!showModal) return
    generate()
  }, [eventIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    clear()
  }, [clear])

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-lg font-medium mb-3">总评</div>
      <div className="flex-1 overflow-y-auto">
        <SummaryTable summary={summary} />
        <div className="mt-6 mb-2 text-sm text-slate-300">选一个天赋继承到下一世（可跳过）</div>
        <div className="space-y-2">
          {ownedTalents.map(t => (
            <TalentCard
              key={t.id}
              talent={t}
              selected={talentExtend === String(t.id)}
              onToggle={() => setTalentExtend(talentExtend === String(t.id) ? null : String(t.id))}
            />
          ))}
        </div>
      </div>

      {error && <div className="mt-2 text-center text-sm text-red-400">{error}</div>}

      <div className="mt-3 space-y-2">
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleSharePoster}
          disabled={isGenerating}
        >
          {isGenerating ? '生成中…' : '分享海报'}
        </Button>
        <Button className="w-full" onClick={finishSummary}>再来一次</Button>
      </div>

      {/* 隐藏的 PosterCard，用于 html2canvas 捕获 */}
      <div ref={cardRef} style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <PosterCard
          summary={summary}
          talents={ownedTalents}
          dramaticEvent={dramaticEventText}
        />
      </div>

      {showModal && dataUrl && (
        <PosterModal
          dataUrl={dataUrl}
          onSwapEvent={handleSwapEvent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 运行全部测试确认无回归**

```bash
pnpm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: 全部 PASS，无新 FAIL

- [ ] **Step 3: 启动开发服务器手动验证**

```bash
pnpm dev
```

验证步骤（浏览器打开 http://localhost:5174，竖屏模式）：
1. 完整玩一局至 SummaryPage
2. 点击「分享海报」，等待生成
3. 弹层出现，图片显示羊皮纸风格海报
4. 点击「换一条事件」，海报图片应自动重新生成并刷新
5. 长按图片（移动端）或右键另存为（桌面端）确认可保存
6. 点击「保存图片」确认触发下载（`life-poster.png`）
7. 点击遮罩或 × 按钮关闭弹层
8. 再点「再来一次」确认正常重开

- [ ] **Step 4: 提交**

```bash
git add src/pages/SummaryPage.tsx
git commit -m "feat(poster): integrate poster sharing into SummaryPage"
```

---

## 完成标志

- `pnpm test` 全绿，无跳过
- 浏览器中能完成：玩一局 → 分享海报 → 弹层展示 → 保存/下载
- `pnpm build` 无 TypeScript 错误
