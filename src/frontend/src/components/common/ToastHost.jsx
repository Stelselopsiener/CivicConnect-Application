/**
 * Confirmation messages — an OBSERVER of the event bus.
 *
 * No screen ever calls "show toast". Screens run a command through the gateway; the gateway
 * decorator publishes an event; this component is subscribed and turns it into a message. A
 * new reaction (say, analytics) would be another subscriber, with no change to any screen.
 */
import { useCallback, useRef, useState } from 'react'
import { useEventBus } from '../../hooks/useEventBus'
import { useAuth } from '../../hooks/useAuth'
import { EVENT, REQUEST_EVENTS } from '../../services/events/eventBus'
import { ROLE, STATUS } from '../../domain/requestLifecycle'
import Icon from './Icon'

const VISIBLE_MS = 5000

function messageFor(eventName, { request, newStatus, commentOnly, staffId }, user) {
  const ref = request.reference
  switch (eventName) {
    case EVENT.REQUEST_SUBMITTED:
      return `Request ${ref} submitted. We will show updates here as staff respond.`
    case EVENT.REQUEST_ASSIGNED:
      return staffId === user?.id
        ? `You now own ${ref}. Status is ${request.status}.`
        : `${ref} assigned to ${request.owner?.name ?? 'a colleague'}.`
    case EVENT.REQUEST_CATEGORY_CHANGED:
      return `${ref} moved to ${request.category}.`
    case EVENT.REQUEST_STATUS_CHANGED:
      if (commentOnly) return 'Update saved. The requester can see it now.'
      if (newStatus === STATUS.CANCELLED && user?.role === ROLE.REQUESTER) return `Request ${ref} cancelled.`
      return `${ref} is now ${newStatus}. The requester can see this update.`
    default:
      return null
  }
}

export default function ToastHost() {
  const { user } = useAuth()
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback(
    (payload, eventName) => {
      const message = messageFor(eventName, payload, user)
      if (!message) return
      clearTimeout(timer.current)
      setToast({ message, key: Date.now() })
      timer.current = setTimeout(() => setToast(null), VISIBLE_MS)
    },
    [user],
  )

  useEventBus(REQUEST_EVENTS, show)

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      {toast && (
        <div key={toast.key} className="toast-in pointer-events-auto flex max-w-md items-start gap-3 rounded-md bg-ink px-4 py-3 text-white shadow-pop">
          <Icon name="check" className="mt-0.5 text-civic-300" />
          <p>{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="-mr-1 cursor-pointer rounded p-0.5 text-white/70 hover:text-white">
            <Icon name="close" size={16} label="Dismiss" />
          </button>
        </div>
      )}
    </div>
  )
}
