import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { SummaryTable } from '../components/game/SummaryTable'
import { TalentCard } from '../components/game/TalentCard'
import type { LifeSummary } from '../core/types'

export function SummaryPage() {
  const life = useGameStore(s => s.life)
  const selectedTalents = useGameStore(s => s.selectedTalents)
  const randomTalents = useGameStore(s => s.randomTalents)
  const talentExtend = useGameStore(s => s.talentExtend)
  const setTalentExtend = useGameStore(s => s.setTalentExtend)
  const finishSummary = useGameStore(s => s.finishSummary)

  const ownedTalents = randomTalents.filter(t => selectedTalents.has(String(t.id)))

  if (!life) return null

  const summary = life.summary as LifeSummary

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
      <div className="mt-3">
        <Button className="w-full" onClick={finishSummary}>再来一次</Button>
      </div>
    </div>
  )
}
