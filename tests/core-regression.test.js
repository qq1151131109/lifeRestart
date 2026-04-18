import { describe, it, expect } from 'vitest'
import { runSeed, readFixture } from '../repl/harness.js'

const SEEDS = [42, 1337, 2024]

describe('core behavior regression (baseline = current src/modules)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} matches fixture`, async () => {
      const expected = await readFixture(seed)
      const actual = await runSeed(seed, 'repl/deterministic.js')
      expect(actual).toBe(expected)
    }, 60000)
  }
})
