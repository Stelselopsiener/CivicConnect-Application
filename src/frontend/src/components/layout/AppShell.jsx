import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import DemoModeBanner from '../common/DemoModeBanner'

export default function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <DemoModeBanner />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-4xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
