import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { formatAgo, plural } from '../../utils/format'
import Icon from '../common/Icon'

export default function NotificationBell({ user }) {
  const { items, unread, markSeen } = useNotifications(user)
  const [open, setOpen] = useState(false)
  const container = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !container.current?.contains(event.target))) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const toggle = () => {
    if (open) markSeen() // items stay highlighted while the panel is open, then count as read
    setOpen(!open)
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Notifications, ${unread} unread`}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="tabular absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal-400 px-1 text-xs font-semibold text-ink">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-raised text-ink shadow-pop">
          <p className="border-b border-line px-4 py-3 font-semibold">
            {unread > 0 ? `${unread} new ${plural(unread, 'update')}` : 'Notifications'}
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-ink-soft">Nothing needs your attention right now.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} onClick={toggle} className="block px-4 py-3 hover:bg-paper">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{item.title}</span>
                      <span className="shrink-0 text-sm text-ink-soft">{formatAgo(item.date)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{item.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
