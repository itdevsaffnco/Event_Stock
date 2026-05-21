import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Warehouse, CalendarDays, LogOut, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth.api'
import saffLogo from '@/assets/Assets_Saff/Saffnco_logo.png'

const navItems = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/admin/warehouses', label: 'Warehouse',   icon: Warehouse },
  { to: '/admin/events',     label: 'Events',      icon: CalendarDays },
  { to: '/admin/users',      label: 'Account',     icon: Users },
]

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    clearAuth()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-100 flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <img src={saffLogo} alt="Saff & Co." className="h-11 w-11 object-contain rounded-xl border border-slate-100" />
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">Saff & Co.</p>
            <p className="text-xs text-slate-400 leading-tight">Event Stock</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
