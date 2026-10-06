/**
 * Application event bus — DESIGN PATTERN: Observer (publish / subscribe).
 *
 * Mirrors backend decision D12: the command finishes first, then one event is published for
 * optional reactions. Publishers do not know who is listening. Current subscribers:
 *   - ToastHost         shows the confirmation message
 *   - NotificationBell  refreshes the unread count
 *   - useAsync          reloads lists that declared `refreshOn`
 *   - AuthContext       signs the user out on SESSION_EXPIRED
 *
 * As in D12, a failing subscriber is logged and never breaks the publisher or other subscribers.
 */
export const EVENT = Object.freeze({
  REQUEST_SUBMITTED: 'request.submitted',
  REQUEST_STATUS_CHANGED: 'request.statusChanged',
  REQUEST_ASSIGNED: 'request.assigned',
  REQUEST_CATEGORY_CHANGED: 'request.categoryChanged',
  SESSION_EXPIRED: 'session.expired',
})

export const REQUEST_EVENTS = Object.freeze([
  EVENT.REQUEST_SUBMITTED,
  EVENT.REQUEST_STATUS_CHANGED,
  EVENT.REQUEST_ASSIGNED,
  EVENT.REQUEST_CATEGORY_CHANGED,
])

export function createEventBus() {
  const subscribers = new Map()

  return {
    /** @returns {() => void} unsubscribe function */
    subscribe(eventName, handler) {
      if (!subscribers.has(eventName)) subscribers.set(eventName, new Set())
      subscribers.get(eventName).add(handler)
      return () => subscribers.get(eventName)?.delete(handler)
    },

    publish(eventName, payload) {
      for (const handler of [...(subscribers.get(eventName) ?? [])]) {
        try {
          handler(payload, eventName)
        } catch (error) {
          console.error(`[eventBus] subscriber for "${eventName}" failed`, error)
        }
      }
    },
  }
}

/** One bus for the whole app (module-level Singleton). */
export const eventBus = createEventBus()
