interface PosterModalProps {
  dataUrl: string
  onSwapEvent: () => void
  onClose: () => void
}

export function PosterModal({ dataUrl, onSwapEvent, onClose }: PosterModalProps) {
  return (
    <div
      data-testid="poster-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      {/* 关闭按钮 */}
      <button
        aria-label="关闭"
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#fff',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* 内容区域，阻止冒泡到 overlay */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
      >
        <img
          src={dataUrl}
          alt="人生海报"
          style={{ maxHeight: '70vh', borderRadius: '8px', display: 'block' }}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onSwapEvent}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            换一条事件
          </button>

          <a
            href={dataUrl}
            download="life-poster.png"
            style={{
              background: '#fef3c7',
              color: '#92400e',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            保存图片
          </a>
        </div>

        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          长按图片可直接保存
        </div>
      </div>
    </div>
  )
}
