import { formatDateTime } from '../../utils/format'
import StatusPill from './StatusPill'

/**
 * History of a request, newest first, read from the action rows staff write (REQ-004, REQ-006,
 * REQ-021). `audience="requester"` hides staff names behind the team name; staff and
 * management see who acted.
 */
export default function Timeline({ actions, audience = 'staff', category }) {
  if (actions.length === 0) return <p className="text-ink-soft">No updates yet.</p>

  const who = (action) => {
    if (!action.actor) return audience === 'requester' ? 'you' : 'the requester'
    return audience === 'requester' ? `the ${category} team` : action.actor.name
  }

  return (
    <ol className="flex flex-col">
      {actions.map((action, index) => (
        <li key={action.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < actions.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-0.5 bg-line" aria-hidden="true" />}
          <span
            className={`relative mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${index === 0 ? 'border-civic-500 bg-civic-500' : 'border-line-strong bg-raised'}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {action.statusChanged || action.type === 'Submitted' ? (
                <StatusPill status={action.newStatus} />
              ) : (
                <span className="font-semibold">{action.type}</span>
              )}
              <span className="tabular text-sm text-ink-soft">
                {formatDateTime(action.date)} by {who(action)}
              </span>
            </p>
            {action.detail && <p className="mt-1 text-sm font-medium">{action.detail}</p>}
            {action.comment && <p className="mt-1 max-w-prose">{action.comment}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
