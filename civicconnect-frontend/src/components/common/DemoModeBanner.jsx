import { resetMockData } from '../../services/mock/mockStore'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true'

export default function DemoModeBanner() {
  if (!USE_MOCK) return null

  const handleReset = () => {
    resetMockData()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-signal-500/40 bg-signal-300/30 px-4 py-2 text-xs text-signal-700">
      <span>
        Demo mode — no backend connected. Data is stored locally in your browser and isn't shared with anyone else.
      </span>
      <button onClick={handleReset} className="font-medium underline underline-offset-2 hover:no-underline">
        Reset demo data
      </button>
    </div>
  )
}
