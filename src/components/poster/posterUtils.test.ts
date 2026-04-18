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
