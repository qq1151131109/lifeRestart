import { describe, it, expect } from 'vitest'
import { defaultConfig } from './config'
import { PropertyType, AchievementOpportunity } from './types'

describe('core types/config', () => {
  it('defaultConfig has expected shape', () => {
    expect(defaultConfig.defaultPropertyPoints).toBe(20)
    expect(defaultConfig.talentConfig.talentRate[1]).toBe(100)
    expect(defaultConfig.propertyConfig.judge.HAGE).toBeInstanceOf(Array)
  })
  it('exports PropertyType keys', () => {
    expect(PropertyType.TLT).toBe('TLT')
    expect(AchievementOpportunity.START).toBe('START')
  })
})
