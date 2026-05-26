import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-libro-bg text-libro-text">
      <Outlet />
    </div>
  )
}
