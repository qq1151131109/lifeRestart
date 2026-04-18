import type { LifeSummary } from '@/core/types'
import zh from '@/i18n/zh-cn'

const dims = [
  { label: '颜值', key: 'HCHR' },
  { label: '智力', key: 'HINT' },
  { label: '体质', key: 'HSTR' },
  { label: '家境', key: 'HMNY' },
  { label: '快乐', key: 'HSPR' },
  { label: '享年', key: 'HAGE' },
  { label: '总评', key: 'SUM' },
] as const

export function SummaryTable({ summary }: { summary: LifeSummary }) {
  const gradeColor = (g: number) =>
    g === 0 ? 'text-slate-300' : g === 1 ? 'text-blue-300' : g === 2 ? 'text-purple-300' : 'text-yellow-300'

  return (
    <div className="space-y-2">
      {dims.map(({ label, key }) => {
        const d = summary[key]
        if (!d) return null
        return (
          <div key={key} className="flex justify-between items-center py-2 border-b border-slate-800">
            <span className="text-slate-300">{label}</span>
            <span className={gradeColor(d.grade)}>{d.value} · {zh[d.judge] ?? d.judge}</span>
          </div>
        )
      })}
    </div>
  )
}
