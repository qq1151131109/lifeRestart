import { useEffect } from 'react'
import { LandscapeLockout } from './components/LandscapeLockout'
import { useGameStore } from './store'
import { HomePage } from './pages/HomePage'
import { SetupPage } from './pages/SetupPage'
import { PlayPage } from './pages/PlayPage'
import { SummaryPage } from './pages/SummaryPage'

export default function App() {
  const step = useGameStore(s => s.step)
  const initialized = useGameStore(s => s.initialized)
  const initialize = useGameStore(s => s.initialize)

  useEffect(() => { void initialize() }, [initialize])

  if (!initialized) {
    return (
      <LandscapeLockout>
        <div className="h-dvh flex items-center justify-center text-slate-100">
          Now Loading…
        </div>
      </LandscapeLockout>
    )
  }

  return (
    <LandscapeLockout>
      <div className="h-dvh flex flex-col pt-safe-top pb-safe-bottom overflow-hidden">
        {step === 'home' && <HomePage />}
        {(step === 'talent' || step === 'property') && <SetupPage />}
        {step === 'trajectory' && <PlayPage />}
        {step === 'summary' && <SummaryPage />}
      </div>
    </LandscapeLockout>
  )
}
