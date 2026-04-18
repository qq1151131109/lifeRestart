export const PropertyType = {
  AGE: 'AGE',
  CHR: 'CHR', INT: 'INT', STR: 'STR', MNY: 'MNY',
  SPR: 'SPR', LIF: 'LIF', EVT: 'EVT', TLT: 'TLT',
  HCHR: 'HCHR', HINT: 'HINT', HSTR: 'HSTR',
  HMNY: 'HMNY', HSPR: 'HSPR', HAGE: 'HAGE',
  SUM: 'SUM', TMS: 'TMS', CACHV: 'CACHV',
  RTLT: 'RTLT', REVT: 'REVT',
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
  id: string
  name: string
  description: string
  grade: TalentGrade
  exclusive?: string[]
  condition?: unknown
  effect?: Record<string, number>
  replacement?: Record<string, number>
  status?: number
  max_triggers?: number
}

export interface EventMeta {
  id: string
  event: string
  include?: string
  exclude?: string
  NoRandom?: number
  effect?: Record<string, number>
  postEvent?: string
  branch?: Array<[unknown, string]>
  grade?: TalentGrade
}

export interface AchievementMeta {
  id: string
  name: string
  description: string
  opportunity: AchievementOpportunityKey
  condition: unknown
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

export interface SummaryEntry {
  value: number
  grade: TalentGrade
  judge: string
}

export type LifeSummary = Partial<Record<PropertyTypeKey, SummaryEntry>>
