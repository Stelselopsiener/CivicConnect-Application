import { useCallback, useMemo, useState } from 'react'
import { requestGateway } from '../services'
import { DERIVED_VIEW } from '../services/requestGateway'
import { REQUEST_EVENTS } from '../services/events/eventBus'
import { storage } from '../services/session'
import { ROLE, STATUS } from '../domain/requestLifecycle'
import { useAsync } from './useAsync'

const RECENT_DAYS = 14
const MAX_ITEMS = 8
const recent = (date) => date && Date.now() - date.getTime() < RECENT_DAYS * 86400000

/**
 * What "needs your attention" means differs per role, so each role has its own feed builder
 * (Strategy, selected by user_type). All three read data the user is already allowed to see.
 *
 * Requester feedback is read from the action rows, not from email: in-app feedback is not a
 * notification channel and cannot fail separately from the status change (D11, S-IN-003).
 */
const FEEDS = {
  [ROLE.REQUESTER]: async () =>
    (await requestGateway.listMine())
      .flatMap((request) =>
        request.actions
          .filter((action) => action.actor && recent(action.date))
          .map((action) => ({
            id: action.id,
            date: action.date,
            to: `/requests/${request.id}`,
            title: action.statusChanged ? `${request.reference} is now ${action.newStatus}` : `Update on ${request.reference}`,
            body: action.comment || request.title,
          })),
      ),

  [ROLE.STAFF]: async (user) =>
    (await requestGateway.listForStaff({ status: STATUS.PENDING }))
      .filter((request) => !request.owner)
      .map((request) => ({
        id: `new-${request.id}`,
        date: request.createdAt,
        to: `/requests/${request.id}`,
        title: `New in ${user.category}: ${request.reference}`,
        body: request.title,
      })),

  [ROLE.MANAGEMENT]: async () =>
    (await requestGateway.listAll({ status: DERIVED_VIEW.OVERDUE })).map((request) => ({
      id: `overdue-${request.id}`,
      date: request.targetDate,
      to: `/requests/${request.id}`,
      title: `${request.reference} is overdue`,
      body: `${request.category}: ${request.title}`,
    })),
}

export function useNotifications(user) {
  const seenKey = `civicconnect.seen.${user.id}`
  const [seenAt, setSeenAt] = useState(() => Number(storage.get(seenKey)) || 0)

  const { data } = useAsync(() => FEEDS[user.role]?.(user) ?? Promise.resolve([]), [user.id, user.role], {
    refreshOn: REQUEST_EVENTS,
  })

  const items = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.date - a.date).slice(0, MAX_ITEMS),
    [data],
  )
  const unread = items.filter((item) => item.date.getTime() > seenAt).length

  const markSeen = useCallback(() => {
    const now = Date.now()
    storage.set(seenKey, String(now))
    setSeenAt(now)
  }, [seenKey])

  return { items, unread, markSeen }
}
