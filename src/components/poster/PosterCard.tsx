import zh from '@/i18n/zh-cn'
import type { LifeSummary, TalentMeta } from '@/core/types'

interface PosterCardProps {
  summary: LifeSummary
  talents: TalentMeta[]
  dramaticEvent: string
}

const GRID_DIMS = [
  { label: '颜值', key: 'HCHR' },
  { label: '智力', key: 'HINT' },
  { label: '体质', key: 'HSTR' },
  { label: '家境', key: 'HMNY' },
  { label: '快乐', key: 'HSPR' },
  { label: '享年', key: 'HAGE' },
] as const

function gradeColor(g: number): string {
  const colors = ['#a8956a', '#4d7c0f', '#b45309', '#92400e']
  return colors[g] ?? '#a8956a'
}

export function PosterCard({ summary, talents, dramaticEvent }: PosterCardProps) {
  const age = summary.HAGE?.value ?? '?'
  const sumEntry = summary.SUM
  const overallJudge = sumEntry ? (zh[sumEntry.judge] ?? sumEntry.judge) : ''

  return (
    <div style={{
      width: '360px',
      height: '640px',
      background: '#fef9ef',
      border: '2px solid #e7d9c0',
      borderRadius: '12px',
      fontFamily: "'PingFang SC', 'Noto Serif SC', serif",
      color: '#1c1917',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 20px',
      boxSizing: 'border-box',
    }}>
      {/* 顶部标题 */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#a8956a', letterSpacing: '3px', marginBottom: '16px' }}>
        人生重开模拟器
      </div>

      {/* 享年 + 总评 */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#92400e' }}>享年 {age}岁</div>
        <div style={{ fontSize: '13px', color: '#a8956a', marginTop: '4px' }}>
          总分 {sumEntry?.value ?? '?'}
        </div>
      </div>

      {/* 6维属性网格 3列 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        {GRID_DIMS.map(({ label, key }) => {
          const d = summary[key]
          if (!d) return null
          return (
            <div key={key} style={{
              background: '#fdf3e3',
              border: '1px solid #e7d9c0',
              borderRadius: '8px',
              padding: '8px 4px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: '#7c5c3a', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{d.value}</div>
              <div style={{ fontSize: '10px', color: gradeColor(d.grade), marginTop: '2px' }}>
                {zh[d.judge] ?? d.judge}
              </div>
            </div>
          )
        })}
      </div>

      {/* SUM 单行居中 */}
      {sumEntry && (
        <div style={{
          background: '#fdf3e3',
          border: '1px solid #e7d9c0',
          borderRadius: '8px',
          padding: '8px',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '11px', color: '#7c5c3a', marginRight: '8px' }}>总评</span>
          <span style={{ fontSize: '18px', fontWeight: 700, marginRight: '6px' }}>{sumEntry.value}</span>
          <span style={{ fontSize: '10px', color: gradeColor(sumEntry.grade) }}>{zh[sumEntry.judge] ?? sumEntry.judge}</span>
        </div>
      )}

      {/* 天赋标签 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#a8956a', marginBottom: '6px' }}>天赋</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {talents.slice(0, 3).map(t => (
            <span key={t.id} style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '11px',
            }}>
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* 戏剧性事件引言 */}
      <div style={{ borderTop: '1px solid #e7d9c0', paddingTop: '12px', flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: '#7c5c3a', fontStyle: 'italic', lineHeight: 1.6 }}>
          "{dramaticEvent}"
        </div>
      </div>

      {/* 水印 */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#c4a97a', marginTop: '12px' }}>
        lifeRestart · syaro.io
      </div>
    </div>
  )
}
