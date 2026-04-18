import { useState, useCallback } from 'react'
import type { RefObject } from 'react'

export function usePosterExport(cardRef: RefObject<HTMLDivElement>) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!cardRef.current) return
    setIsGenerating(true)
    setError(null)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true })
      setDataUrl(canvas.toDataURL('image/png'))
    } catch {
      setError('海报生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }, [cardRef])

  const clear = useCallback(() => {
    setDataUrl(null)
    setError(null)
  }, [])

  return { dataUrl, isGenerating, error, generate, clear }
}
