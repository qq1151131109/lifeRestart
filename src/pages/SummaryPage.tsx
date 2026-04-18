import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { SummaryTable } from '../components/game/SummaryTable'
import { TalentCard } from '../components/game/TalentCard'
import { PosterCard } from '../components/poster/PosterCard'
import { PosterModal } from '../components/poster/PosterModal'
import { usePosterExport } from '../hooks/usePosterExport'
import { selectDramaticEvents } from '../components/poster/posterUtils'
import type { LifeSummary } from '../core/types'

export function SummaryPage() {
  const life = useGameStore(s => s.life)
  const selectedTalents = useGameStore(s => s.selectedTalents)
  const randomTalents = useGameStore(s => s.randomTalents)
  const trajectoryLog = useGameStore(s => s.trajectoryLog)
  const talentExtend = useGameStore(s => s.talentExtend)
  const setTalentExtend = useGameStore(s => s.setTalentExtend)
  const finishSummary = useGameStore(s => s.finishSummary)

  const cardRef = useRef<HTMLDivElement>(null)
  const { dataUrl, isGenerating, error, generate, clear } = usePosterExport(cardRef)
  const [showModal, setShowModal] = useState(false)
  const [eventIndex, setEventIndex] = useState(0)

  const ownedTalents = randomTalents.filter(t => selectedTalents.has(String(t.id)))
  const dramaticEvents = selectDramaticEvents(trajectoryLog)

  const handleSharePoster = useCallback(async () => {
    setEventIndex(0)
    await generate()
    setShowModal(true)
  }, [generate])

  const handleSwapEvent = useCallback(() => {
    if (dramaticEvents.length === 0) return
    setEventIndex(i => (i + 1) % dramaticEvents.length)
  }, [dramaticEvents.length])

  // 换一条事件后，PosterCard 内容已更新，重新生成海报图片
  useEffect(() => {
    if (!showModal) return
    generate()
  }, [eventIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    clear()
  }, [clear])

  if (!life) return null

  const summary = life.summary as LifeSummary
  const currentEvent = dramaticEvents[eventIndex]
  const dramaticEventText = currentEvent
    ? `${currentEvent.age}岁 · ${currentEvent.content.description}`
    : `${summary.HAGE?.value ?? '?'}岁 · 一生平淡，却也真实。`

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-lg font-medium mb-3">总评</div>
      <div className="flex-1 overflow-y-auto">
        <SummaryTable summary={summary} />
        <div className="mt-6 mb-2 text-sm text-slate-300">选一个天赋继承到下一世（可跳过）</div>
        <div className="space-y-2">
          {ownedTalents.map(t => (
            <TalentCard
              key={t.id}
              talent={t}
              selected={talentExtend === String(t.id)}
              onToggle={() => setTalentExtend(talentExtend === String(t.id) ? null : String(t.id))}
            />
          ))}
        </div>
      </div>

      {error && <div className="mt-2 text-center text-sm text-red-400">{error}</div>}

      <div className="mt-3 space-y-2">
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleSharePoster}
          disabled={isGenerating}
        >
          {isGenerating ? '生成中…' : '分享海报'}
        </Button>
        <Button className="w-full" onClick={finishSummary}>再来一次</Button>
      </div>

      {/* 隐藏的 PosterCard，用于 html2canvas 捕获 */}
      <div ref={cardRef} style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <PosterCard
          summary={summary}
          talents={ownedTalents}
          dramaticEvent={dramaticEventText}
        />
      </div>

      {showModal && dataUrl && (
        <PosterModal
          dataUrl={dataUrl}
          onSwapEvent={handleSwapEvent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
