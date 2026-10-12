import { useEffect, useRef } from 'react'
import { eventBus } from '../services/events/eventBus'

/**
 * Subscribes a component to application events for as long as it is mounted
 * (the Observer's "attach / detach", tied to the React lifecycle).
 *
 * @param {string[]} eventNames  module-level constant array, e.g. REQUEST_EVENTS
 * @param {(payload, eventName) => void} handler
 */
export function useEventBus(eventNames, handler) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => {
    const unsubscribers = eventNames.map((name) =>
      eventBus.subscribe(name, (payload, eventName) => latest.current(payload, eventName)),
    )
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [eventNames])
}
