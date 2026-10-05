import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/issues', label: 'Browse issues' },
  { to: '/issues/new', label: 'Report an issue' },
]

const STAFF_NAV_ITEMS = [{ to: '/admin', label: 'Municipal dashboard', roles: ['staff', 'admin'] }]

function linkClasses({ isActive }) {
  return `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-civic-500 text-white' : 'text-ink-soft hover:bg-black/5'
  }`
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const visibleStaffItems = STAFF_NAV_ITEMS.filter((item) => item.roles.includes(user?.role))

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col justify-between border-r border-line bg-paper-raised px-4 py-6">
      <div>
        <div className="mb-8 px-2">
          <p className="font-display text-lg font-semibold text-civic-700">CivicConnect</p>
          <p className="text-xs text-ink-soft">Community issue reporting</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClasses} end={item.to === '/dashboard'}>
              {item.label}
            </NavLink>
          ))}
          {visibleStaffItems.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              {visibleStaffItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClasses}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      </div>

      <div className="border-t border-line pt-4">
        <p className="truncate px-2 text-sm font-medium text-ink">{user?.name}</p>
        <p className="truncate px-2 text-xs text-ink-soft">{user?.email}</p>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-md px-2 py-2 text-left text-sm font-medium text-brick-500 hover:bg-brick-300/15"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
