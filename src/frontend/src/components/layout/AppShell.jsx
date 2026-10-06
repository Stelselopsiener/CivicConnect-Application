import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import DemoModeBanner from '../common/DemoModeBanner'
import ToastHost from '../common/ToastHost'

export default function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-raised focus:px-3 focus:py-2">
        Skip to content
      </a>
      <DemoModeBanner />
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  )
}
