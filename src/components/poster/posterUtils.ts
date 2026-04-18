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
