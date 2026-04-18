import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState({ step: 'home', selectedTalents: new Set(), isEnd: false, trajectoryLog: [] })
  })

  it('starts at home', () => {
    expect(useGameStore.getState().step).toBe('home')
  })

  it('toggleTalent respects 3-limit', () => {
    useGameStore.setState({
      life: { exclude: () => null } as any,
      randomTalents: [
        { id: 1, name: 'A', description: '', grade: 1 },
        { id: 2, name: 'B', description: '', grade: 1 },
        { id: 3, name: 'C', description: '', grade: 1 },
        { id: 4, name: 'D', description: '', grade: 1 },
      ] as any,
    })
    useGameStore.getState().toggleTalent('1')
    useGameStore.getState().toggleTalent('2')
    useGameStore.getState().toggleTalent('3')
    useGameStore.getState().toggleTalent('4')  // should be ignored — already at 3
    expect(useGameStore.getState().selectedTalents.size).toBe(3)
  })
})
