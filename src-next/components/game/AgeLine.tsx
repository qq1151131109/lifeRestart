import type { TrajectoryContent } from '@/core/types'

export function AgeLine({ age, content }: { age: number; content: TrajectoryContent[] }) {
  return (
    <div className="py-2 border-b border-slate-800">
      <div className="flex gap-3">
        <div className="w-12 text-slate-400 text-sm pt-0.5">{age}岁</div>
        <div className="flex-1 space-y-1 text-sm">
          {content.map((c, i) => {
            if (c.type === 'TLT') {
              return <div key={i} className="text-purple-300">天赋【{c.name}】发动：{c.description}</div>
            }
            return (
              <div key={i}>
                <div>{c.description}</div>
                {c.postEvent && <div className="text-slate-400 text-xs mt-0.5">{c.postEvent}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
