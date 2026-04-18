import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRef } from 'react'

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}))

import html2canvas from 'html2canvas'
import { usePosterExport } from './usePosterExport'

describe('usePosterExport', () => {
  beforeEach(() => {
    vi.mocked(html2canvas).mockReset()
  })

  it('starts with null dataUrl and not generating', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })
    expect(result.current.dataUrl).toBeNull()
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets isGenerating true while html2canvas runs', async () => {
    let resolve!: (v: HTMLCanvasElement) => void
    vi.mocked(html2canvas).mockReturnValue(new Promise(r => { resolve = r }))

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })

    act(() => { result.current.generate() })
    expect(result.current.isGenerating).toBe(true)

    const canvas = { toDataURL: () => 'data:image/png;base64,abc' } as HTMLCanvasElement
    await act(async () => { resolve(canvas) })
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.dataUrl).toBe('data:image/png;base64,abc')
  })

  it('sets error on html2canvas failure', async () => {
    vi.mocked(html2canvas).mockRejectedValue(new Error('canvas error'))

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })

    await act(async () => { await result.current.generate() })
    expect(result.current.dataUrl).toBeNull()
    expect(result.current.error).toBe('海报生成失败，请重试')
    expect(result.current.isGenerating).toBe(false)
  })

  it('clear resets dataUrl and error', async () => {
    vi.mocked(html2canvas).mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement('div'))
      return usePosterExport(ref)
    })

    await act(async () => { await result.current.generate() })
    expect(result.current.error).toBe('海报生成失败，请重试')

    act(() => { result.current.clear() })
    expect(result.current.error).toBeNull()
    expect(result.current.dataUrl).toBeNull()
  })
})
