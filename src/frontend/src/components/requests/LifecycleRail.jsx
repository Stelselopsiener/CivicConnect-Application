import { MAIN_PATH, STATUS, stateOf } from '../../domain/requestLifecycle'
import Icon from '../common/Icon'

/**
 * The request lifecycle drawn as a rail — the D10 state model made visible.
 *
 * The steps come from the State objects (MAIN_PATH), not from a hard-coded list in the UI.
 * A request that left the main path (Rejected, Cancelled) shows where it stopped.
 * `showMeaning` adds the plain-language explanation written for requesters.
 */
export default function LifecycleRail({ status, showMeaning = false }) {
  const offPath = status === STATUS.REJECTED || status === STATUS.CANCELLED
  const steps = offPath ? [STATUS.PENDING, status] : MAIN_PATH
  const currentIndex = steps.indexOf(status)

  return (
    <div className="rounded-lg border border-line bg-raised px-4 py-4 shadow-card sm:px-6">
      <ol className="flex" aria-label={`Progress: ${status}`}>
        {steps.map((step, index) => {
          const done = index < currentIndex
          const current = index === currentIndex
          const stopped = current && offPath
          return (
            <li key={step} className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center" aria-current={current ? 'step' : undefined}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2 ${index <= currentIndex ? (stopped ? 'bg-brick-500' : 'bg-civic-500') : 'bg-line'}`}
                />
              )}
              <span
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                  stopped
                    ? 'border-brick-500 bg-brick-500 text-white'
                    : done
                      ? 'border-civic-500 bg-civic-500 text-white'
                      : current
                        ? 'border-civic-500 bg-raised ring-4 ring-civic-100'
                        : 'border-line-strong bg-raised'
                }`}
              >
                {done && <Icon name="check" size={14} />}
                {stopped && <Icon name="close" size={14} />}
                {current && !stopped && <span className="h-2.5 w-2.5 rounded-full bg-civic-500" />}
              </span>
              <span className={`px-0.5 text-xs leading-tight sm:text-sm ${current ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-ink-soft'}`}>
                {step}
                <span className="sr-only">{done ? ' (done)' : current ? ' (current)' : ' (not yet)'}</span>
              </span>
            </li>
          )
        })}
      </ol>
      {showMeaning && <p className="mt-4 border-t border-line pt-3 text-ink-soft">{stateOf(status).meaning}</p>}
    </div>
  )
}
