// Mirrors property.js `TYPES` (35 keys). Keep 1:1 with source — Task 12
// (property.ts port) and Task 14 (life.ts port) rely on every key here.
export const PropertyType = {
  // 本局
  AGE: 'AGE',
  CHR: 'CHR', INT: 'INT', STR: 'STR', MNY: 'MNY',
  SPR: 'SPR', LIF: 'LIF', TLT: 'TLT', EVT: 'EVT', TMS: 'TMS',
  // Auto calc (low/high)
  LAGE: 'LAGE', HAGE: 'HAGE',
  LCHR: 'LCHR', HCHR: 'HCHR',
  LINT: 'LINT', HINT: 'HINT',
  LSTR: 'LSTR', HSTR: 'HSTR',
  LMNY: 'LMNY', HMNY: 'HMNY',
  LSPR: 'LSPR', HSPR: 'HSPR',
  SUM: 'SUM',
  EXT: 'EXT',
  // Achievement total / count / grand-total / rate
  ATLT: 'ATLT', AEVT: 'AEVT', ACHV: 'ACHV',
  CTLT: 'CTLT', CEVT: 'CEVT', CACHV: 'CACHV',
  TTLT: 'TTLT', TEVT: 'TEVT', TACHV: 'TACHV',
  REVT: 'REVT', RTLT: 'RTLT', RACHV: 'RACHV',
  // Special
  RDM: 'RDM',
} as const

export type PropertyTypeKey = typeof PropertyType[keyof typeof PropertyType]

export const AchievementOpportunity = {
  START: 'START',
  END: 'END',
  TRAJECTORY: 'TRAJECTORY',
  SUMMARY: 'SUMMARY',
} as const

export type AchievementOpportunityKey =
  typeof AchievementOpportunity[keyof typeof AchievementOpportunity]

export type TalentGrade = 0 | 1 | 2 | 3

export interface TalentMeta {
  id: number
  name: string
  description: string
  grade: TalentGrade
  // Flag (value `1`) meaning "not pullable in random pool". NOT the exclusion list.
  exclusive?: number
  // Actual mutual-exclusion list of talent ids.
  exclude?: string[]
  condition?: string
  effect?: Record<string, number>
  replacement?: Record<string, number>
  status?: number
  max_triggers?: number
}

export interface EventMeta {
  id: number
  event: string
  include?: string
  exclude?: string
  NoRandom?: number
  effect?: Record<string, number>
  postEvent?: string
  // [conditionString, nextEventId] tuples — event.js maps `"cond:id"` → [cond, Number(id)]
  branch?: Array<[string, number]>
  grade?: TalentGrade
}

export interface AchievementMeta {
  id: number
  name: string
  description: string
  opportunity: AchievementOpportunityKey
  condition: string
  grade?: TalentGrade
  hide?: number
}

export interface LifeConfig {
  defaultPropertyPoints: number
  talentSelectLimit: number
  propertyAllocateLimit: [number, number]
  defaultPropertys: Partial<Record<PropertyTypeKey, number>>
  talentConfig: {
    talentPullCount: number
    talentRate: Record<string, number>
    additions: Record<string, Array<[number, Record<string, number>]>>
  }
  propertyConfig: {
    judge: Record<string, Array<[number, TalentGrade] | [number, TalentGrade, string]>>
  }
  characterConfig: {
    characterPullCount: number
    rateableKnife: number
    propertyWeight: Array<[number, number]>
    talentWeight: Array<[number, number]>
  }
}

export interface TrajectoryContent {
  type: 'TLT' | 'EVT'
  name?: string
  grade?: TalentGrade
  description: string
  postEvent?: string
}

export interface NextResult {
  age: number
  content: TrajectoryContent[]
  isEnd: boolean
}

// Shape of each entry in property.judge() — mirrors `{prop, value, judge, grade, progress}`.
export interface SummaryEntry {
  prop: string
  value: number
  grade: TalentGrade
  judge: string
  progress: number
}

export type LifeSummary = Partial<Record<PropertyTypeKey, SummaryEntry>>
