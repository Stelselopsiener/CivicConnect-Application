import { Link, Outlet } from 'react-router-dom'
import DemoModeBanner from '../common/DemoModeBanner'

export default function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <DemoModeBanner />
      <header className="border-b border-line px-8 py-5">
        <Link to="/" className="font-display text-xl font-semibold text-civic-700">
          CivicConnect
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Outlet />
      </main>
      <footer className="border-t border-line px-8 py-4 text-center text-xs text-ink-soft">
        CivicConnect — a community issue reporting platform. SEN381 project build.
      </footer>
    </div>
  )
}
