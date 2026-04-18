import { useGameStore } from '../../store'

const labels = { CHR: '颜值', INT: '智力', STR: '体质', MNY: '家境' } as const

export function PropertyAllocator() {
  const alloc = useGameStore(s => s.propertyAlloc)
  const setProperty = useGameStore(s => s.setProperty)
  const randomProperty = useGameStore(s => s.randomProperty)

  const used = alloc.CHR + alloc.INT + alloc.STR + alloc.MNY
  const remaining = alloc.total - used

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-slate-300">
        <span>剩余点数</span>
        <span className="text-slate-100">{remaining} / {alloc.total}</span>
      </div>
      {(['CHR','INT','STR','MNY'] as const).map(tag => (
        <div key={tag} className="flex items-center gap-3">
          <div className="w-16 text-sm">{labels[tag]}</div>
          <button
            className="w-10 h-10 rounded-full bg-slate-700 text-xl active:scale-95"
            onClick={() => setProperty(tag, -1, 'add')}
          >-</button>
          <div className="flex-1 text-center text-lg">{alloc[tag]}</div>
          <button
            className="w-10 h-10 rounded-full bg-slate-700 text-xl active:scale-95"
            onClick={() => setProperty(tag, +1, 'add')}
          >+</button>
        </div>
      ))}
      <button
        className="w-full py-2 text-slate-300 underline text-sm"
        onClick={randomProperty}
      >随机分配</button>
    </div>
  )
}
