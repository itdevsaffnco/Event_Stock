import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export default function StaffLayout() {
  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col max-w-lg mx-auto">
      <div className="flex-1 pb-20">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
