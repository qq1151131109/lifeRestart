import { describe, it, expect } from 'vitest'
import { runSeed, readFixture } from '../repl/harness.js'

describe('TS core regression (src-next)', () => {
  for (const seed of [42, 1337, 2024]) {
    it(`seed ${seed} matches baseline`, async () => {
      const actual = await runSeed(seed, 'repl/deterministic-next.js', 'tsx')
      const expected = await readFixture(seed)
      expect(actual).toBe(expected)
    }, 60_000)
  }
})
