import { STATUS } from '../../domain/requestLifecycle'

/**
 * Status = colour + dot shape + word, so it reads in greyscale and to screen readers
 * (WCAG 1.4.1). Open statuses have a solid dot, finished ones a hollow ring. The same D10
 * labels are used on every screen (REQ-004, REQ-019).
 */
const STYLES = {
  [STATUS.PENDING]: { pill: 'bg-signal-100 text-signal-800 border-signal-400', dot: 'bg-signal-800' },
  [STATUS.ACCEPTED]: { pill: 'bg-municipal-100 text-municipal-800 border-municipal-500/50', dot: 'bg-municipal-500' },
  [STATUS.IN_PROGRESS]: { pill: 'bg-municipal-500 text-white border-municipal-500', dot: 'bg-white' },
  [STATUS.COMPLETED]: { pill: 'bg-civic-50 text-civic-700 border-civic-300', dot: 'border-2 border-civic-500' },
  [STATUS.CLOSED]: { pill: 'bg-sunken text-ink-soft border-line-strong', dot: 'border-2 border-ink-soft' },
  [STATUS.REJECTED]: { pill: 'bg-brick-100 text-brick-700 border-brick-500/50', dot: 'border-2 border-brick-500' },
  [STATUS.CANCELLED]: { pill: 'bg-raised text-ink-soft border-line-strong', dot: 'border-2 border-line-strong' },
}

const FALLBACK = { pill: 'bg-sunken text-ink-soft border-line', dot: 'bg-ink-soft' }

export default function StatusPill({ status }) {
  const style = STYLES[status] ?? FALLBACK
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${style.pill}`}>
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  )
}

/** Overdue is derived and shown beside the real status, never instead of it (REQ-022, D10). */
export function OverduePill({ days }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border-2 border-brick-500 bg-raised px-2 py-px text-sm font-semibold whitespace-nowrap text-brick-700">
      Overdue{days ? ` ${days}d` : ''}
    </span>
  )
}
