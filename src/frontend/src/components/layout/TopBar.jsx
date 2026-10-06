import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { navigationFor, roleLabel } from '../../domain/navigation'
import { initials } from '../../utils/format'
import Icon from '../common/Icon'
import NotificationBell from './NotificationBell'

export function Wordmark({ to = '/' }) {
  return (
    <Link to={to} className="flex items-baseline gap-2 rounded text-white">
      <span className="font-display text-[1.35rem] font-semibold tracking-tight">CivicConnect</span>
      <span className="hidden text-sm text-white/65 sm:inline">service requests</span>
    </Link>
  )
}

const desktopLink = ({ isActive }) =>
  `flex h-16 items-center border-b-[3px] px-1 font-medium transition-colors ${
    isActive ? 'border-signal-400 text-white' : 'border-transparent text-white/75 hover:text-white'
  }`

const mobileLink = ({ isActive }) =>
  `block rounded-md px-3 py-2.5 font-medium ${isActive ? 'bg-white/12 text-white' : 'text-white/80 hover:bg-white/8'}`

/**
 * Header for signed-in users. The menu is built by navigationFor(user.role) (Factory Method),
 * so each role sees only its own destinations (REQ-029).
 */
export default function TopBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { items, home } = navigationFor(user.role)

  const handleSignOut = () => {
    signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <header className="on-ink sticky top-0 z-30 bg-ink text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Wordmark to={home} />

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={desktopLink}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <NotificationBell user={user} />
          <div className="hidden items-center gap-3 md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-civic-500 text-sm font-semibold" aria-hidden="true">
              {initials(user.name)}
            </span>
            <span className="leading-tight">
              <span className="block font-medium">{user.name}</span>
              <span className="block text-sm text-white/65">{roleLabel(user)}</span>
            </span>
            <button type="button" onClick={handleSignOut} className="ml-2 cursor-pointer rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium hover:bg-white/10">
              Sign out
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md hover:bg-white/10 md:hidden"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} label={menuOpen ? 'Close menu' : 'Open menu'} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-white/15 px-4 pt-3 pb-4 md:hidden">
          <nav aria-label="Main" className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={mobileLink} onClick={() => setMenuOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
            <span className="leading-tight">
              <span className="block font-medium">{user.name}</span>
              <span className="block text-sm text-white/65">{roleLabel(user)}</span>
            </span>
            <button type="button" onClick={handleSignOut} className="cursor-pointer rounded-md border border-white/25 px-3 py-2 text-sm font-medium">
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
