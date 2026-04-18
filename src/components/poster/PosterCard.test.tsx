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
