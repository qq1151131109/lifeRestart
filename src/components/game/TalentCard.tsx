import type { TalentMeta } from '@/core/types'

const gradeColors: Record<number, string> = {
  0: 'border-slate-600 bg-slate-800',
  1: 'border-blue-500 bg-blue-950',
  2: 'border-purple-500 bg-purple-950',
  3: 'border-yellow-400 bg-yellow-950',
}

export function TalentCard({
  talent, selected, onToggle,
}: { talent: TalentMeta; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left p-3 rounded-xl border-2 transition ${gradeColors[talent.grade] ?? gradeColors[0]} ${selected ? 'ring-2 ring-slate-100' : ''}`}
    >
      <div className="font-medium">{talent.name}</div>
      <div className="text-xs text-slate-300 mt-1">{talent.description}</div>
    </button>
  )
}
