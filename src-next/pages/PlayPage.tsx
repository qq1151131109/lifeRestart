import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { AgeLine } from '../components/game/AgeLine'

export function PlayPage() {
  const log = useGameStore(s => s.trajectoryLog)
  const isEnd = useGameStore(s => s.isEnd)
  const advance = useGameStore(s => s.advance)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [log])

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-sm text-slate-400 mb-2">人生轨迹</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
        {log.map(({ age, result }) => (
          <AgeLine key={age} age={age} content={result.content} />
        ))}
        {log.length === 0 && <div className="text-slate-500 text-sm">点击"下一年"开始人生</div>}
      </div>
      <div className="mt-3">
        <Button className="w-full" onClick={advance}>
          {isEnd ? '查看总评' : '下一年'}
        </Button>
      </div>
    </div>
  )
}
