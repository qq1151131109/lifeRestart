import { useEffect, useState } from 'react'

export function LandscapeLockout({ children }: { children: React.ReactNode }) {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 500px)')
    const update = () => setIsLandscape(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (isLandscape) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-900 text-slate-100 p-8 text-center">
        <div>
          <div className="text-4xl mb-4">📱</div>
          <div className="text-lg">请竖屏游玩</div>
          <div className="text-sm text-slate-400 mt-2">Please rotate your device</div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
