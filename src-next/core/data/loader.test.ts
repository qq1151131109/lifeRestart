import { describe, it, expect, vi } from 'vitest'
import { configureLoader, loadDataSet } from './loader'

describe('loader', () => {
  it('calls fetch with configured language path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    configureLoader({ baseUrl: '/d', language: 'zh-cn' })
    const result = await loadDataSet('events')
    expect(fetchMock).toHaveBeenCalledWith('/d/zh-cn/events.json')
    expect(result).toEqual({ ok: true })
    vi.unstubAllGlobals()
  })
  it('throws on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(loadDataSet('events')).rejects.toThrow(/404/)
    vi.unstubAllGlobals()
  })
})
