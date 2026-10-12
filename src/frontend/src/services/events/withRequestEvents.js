/**
 * Event-publishing gateway — DESIGN PATTERN: Decorator.
 *
 * Wraps any request gateway (HTTP or demo) and returns an object with the same methods. Reads
 * pass straight through. After a command *succeeds* it publishes one event, exactly as the
 * backend publishes RequestStatusChanged only after COMMIT (D12). The wrapped gateway knows
 * nothing about events, and the screens know nothing about who reacts.
 */
import { EVENT } from './eventBus'

/** command name -> [event to publish, extra payload built from the command's arguments] */
const COMMAND_EVENTS = {
  submit: [EVENT.REQUEST_SUBMITTED, () => ({})],
  assign: [EVENT.REQUEST_ASSIGNED, (_id, staffId) => ({ staffId: String(staffId) })],
  changeCategory: [EVENT.REQUEST_CATEGORY_CHANGED, (_id, category) => ({ category })],
  changeStatus: [EVENT.REQUEST_STATUS_CHANGED, (_id, change) => ({ newStatus: change.newStatus })],
  addComment: [EVENT.REQUEST_STATUS_CHANGED, () => ({ commentOnly: true })],
}

export function withRequestEvents(gateway, bus) {
  const decorated = { ...gateway }
  for (const [command, [eventName, describe]] of Object.entries(COMMAND_EVENTS)) {
    decorated[command] = async (...args) => {
      const request = await gateway[command](...args) // throws -> nothing is published
      bus.publish(eventName, { request, ...describe(...args) })
      return request
    }
  }
  return decorated
}
