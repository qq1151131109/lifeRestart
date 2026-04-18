import { Button } from '../components/ui/button'
import { useGameStore } from '../store'
import { TalentCard } from '../components/game/TalentCard'
import { PropertyAllocator } from '../components/game/PropertyAllocator'

export function SetupPage() {
  const step = useGameStore(s => s.step)
  const randomTalents = useGameStore(s => s.randomTalents)
  const selectedTalents = useGameStore(s => s.selectedTalents)
  const toggleTalent = useGameStore(s => s.toggleTalent)
  const confirmTalents = useGameStore(s => s.confirmTalents)
  const startTrajectory = useGameStore(s => s.startTrajectory)
  const goHome = useGameStore(s => s.goHome)
  const alloc = useGameStore(s => s.propertyAlloc)
  const used = alloc.CHR + alloc.INT + alloc.STR + alloc.MNY
  const canStart = used === alloc.total

  if (step === 'talent') {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="mb-3 text-sm text-slate-300">选择 3 个天赋 ({selectedTalents.size}/3)</div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {randomTalents.map(t => (
            <TalentCard
              key={t.id}
              talent={t}
              selected={selectedTalents.has(String(t.id))}
              onToggle={() => toggleTalent(String(t.id))}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={goHome}>返回</Button>
          <Button className="flex-1" disabled={selectedTalents.size !== 3} onClick={confirmTalents}>下一步</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="mb-3 text-sm text-slate-300">分配属性点</div>
      <div className="flex-1"><PropertyAllocator /></div>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" onClick={goHome}>返回</Button>
        <Button className="flex-1" disabled={!canStart} onClick={startTrajectory}>开始人生</Button>
      </div>
    </div>
  )
}
