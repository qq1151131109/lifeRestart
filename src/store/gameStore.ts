import { create } from 'zustand'
import { Life, defaultConfig, configureLoader } from '@/core'
import type { TalentMeta, NextResult } from '@/core/types'

export type Step = 'home' | 'talent' | 'property' | 'trajectory' | 'summary'

interface GameState {
  step: Step
  life: Life | null
  initialized: boolean
  randomTalents: TalentMeta[]
  selectedTalents: Set<string>
  talentExtend: string | null
  propertyAlloc: Record<'CHR'|'INT'|'STR'|'MNY', number> & { total: number; SPR: number }
  trajectoryLog: Array<{ age: number; result: NextResult }>
  isEnd: boolean

  initialize(): Promise<void>
  goHome(): void
  remake(): void
  toggleTalent(id: string): void
  confirmTalents(): void
  setProperty(tag: 'CHR'|'INT'|'STR'|'MNY', delta: number, mode: 'set'|'add'): void
  randomProperty(): void
  startTrajectory(): void
  advance(): void
  setTalentExtend(id: string | null): void
  finishSummary(): void
}

export const useGameStore = create<GameState>((set, get) => {
  const life = new Life()
  life.config(defaultConfig)
  configureLoader({ baseUrl: '/data', language: 'zh-cn' })
  return {
    step: 'home',
    life,
    initialized: false,
    randomTalents: [],
    selectedTalents: new Set(),
    talentExtend: null,
    propertyAlloc: { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 5, total: 20 },
    trajectoryLog: [],
    isEnd: false,

    async initialize() {
      const { life, initialized } = get()
      if (initialized || !life) return
      await life.initial(
        (dataSet: string) => fetch(`/data/zh-cn/${dataSet}.json`).then(r => r.json()),
        (path: string) => fetch(`/data/${path}.json`).then(r => r.json()),
      )
      set({ initialized: true })
    },

    goHome() { set({ step: 'home', isEnd: false, trajectoryLog: [] }) },

    remake() {
      const life = get().life!
      const randomTalents = life.talentRandom()
      set({
        step: 'talent',
        randomTalents,
        selectedTalents: new Set(),
        talentExtend: null,
        trajectoryLog: [],
        isEnd: false,
      })
    },

    toggleTalent(id: string) {
      const { selectedTalents, life } = get()
      const next = new Set(selectedTalents)
      if (next.has(id)) { next.delete(id); set({ selectedTalents: next }); return }
      if (next.size >= 3) return
      const exclusive = life!.exclude(Array.from(next).map(Number), Number(id))
      if (exclusive != null && next.has(String(exclusive))) return
      next.add(id)
      set({ selectedTalents: next })
    },

    confirmTalents() {
      const { selectedTalents, life } = get()
      if (selectedTalents.size !== 3) return
      life!.remake(Array.from(selectedTalents).map(Number))
      const total = life!.getPropertyPoints()
      set({
        step: 'property',
        propertyAlloc: { CHR: 0, INT: 0, STR: 0, MNY: 0, SPR: 5, total },
      })
    },

    setProperty(tag, delta, mode) {
      const { propertyAlloc } = get()
      const current = propertyAlloc[tag]
      const newVal = mode === 'set' ? delta : current + delta
      if (newVal < 0 || newVal > 10) return
      const others = (['CHR','INT','STR','MNY'] as const).filter(t => t !== tag)
        .reduce((s, t) => s + propertyAlloc[t], 0)
      if (newVal + others > propertyAlloc.total) return
      set({ propertyAlloc: { ...propertyAlloc, [tag]: newVal } })
    },

    randomProperty() {
      const { propertyAlloc } = get()
      let t = propertyAlloc.total
      const arr = [10, 10, 10, 10]
      while (t > 0) {
        const sub = Math.round(Math.random() * (Math.min(t, 10) - 1)) + 1
        while (true) {
          const sel = Math.floor(Math.random() * 4) % 4
          if (arr[sel] - sub < 0) continue
          arr[sel] -= sub; t -= sub; break
        }
      }
      set({ propertyAlloc: {
        ...propertyAlloc,
        CHR: 10 - arr[0], INT: 10 - arr[1], STR: 10 - arr[2], MNY: 10 - arr[3],
      }})
    },

    startTrajectory() {
      const { life, propertyAlloc } = get()
      const { CHR, INT, STR, MNY } = propertyAlloc
      life!.start({ CHR, INT, STR, MNY, SPR: 5 })
      set({ step: 'trajectory', trajectoryLog: [], isEnd: false })
    },

    advance() {
      const { life, trajectoryLog, isEnd } = get()
      if (isEnd) { set({ step: 'summary' }); return }
      const result = life!.next()
      set({
        trajectoryLog: [...trajectoryLog, { age: result.age, result }],
        isEnd: result.isEnd,
      })
    },

    setTalentExtend(id: string | null) { set({ talentExtend: id }) },

    finishSummary() {
      const { life, talentExtend } = get()
      if (talentExtend) {
        life!.talentExtend(Number(talentExtend))
      }
      set({ step: 'home' })
    },
  }
})
