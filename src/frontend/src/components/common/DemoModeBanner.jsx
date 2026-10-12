import { isDemoMode } from '../../services'
import { resetDb } from '../../services/mock/mockDb'
import { clearToken } from '../../services/session'

/** Makes it impossible to mistake demo data for the real system. Hidden when the API is live. */
export default function DemoModeBanner() {
  if (!isDemoMode) return null

  const reset = () => {
    resetDb()
    clearToken()
    window.location.assign('/sign-in')
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-signal-100 px-4 py-1.5 text-center text-sm text-signal-800">
      <span>
        <strong className="font-semibold">Demo data.</strong> Nothing here is sent to a server; it is stored in this browser only.
      </span>
      <button type="button" onClick={reset} className="cursor-pointer font-semibold underline underline-offset-2 hover:no-underline">
        Reset demo data
      </button>
    </div>
  )
}
