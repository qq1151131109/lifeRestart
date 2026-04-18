import { Button } from '../components/ui/button'
import { useGameStore } from '../store'

export function HomePage() {
  const remake = useGameStore(s => s.remake)
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-8">
      <div className="text-center mt-16">
        <h1 className="text-3xl font-bold mb-2">人生重开模拟器</h1>
        <p className="text-slate-400 text-sm">这垃圾人生一秒也不想待了</p>
      </div>
      <div className="w-full max-w-xs space-y-3 mb-8">
        <Button className="w-full" onClick={remake}>重开一次</Button>
      </div>
    </div>
  )
}
