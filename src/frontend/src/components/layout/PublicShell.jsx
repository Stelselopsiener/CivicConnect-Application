import { Outlet } from 'react-router-dom'
import { Wordmark } from './TopBar'
import DemoModeBanner from '../common/DemoModeBanner'

export default function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoModeBanner />
      <header className="on-ink bg-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Wordmark to="/sign-in" />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Outlet />
      </main>
    </div>
  )
}
