import { NavLink, useNavigate } from 'react-router-dom'
import { Home, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth.api'

export function BottomNav() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    clearAuth()
    navigate('/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-100 flex z-20">
      <NavLink
        to="/staff"
        end
        className={({ isActive }) =>
          cn(
            'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
            isActive ? 'text-indigo-600' : 'text-slate-500'
          )
        }
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </NavLink>

      <button
        onClick={handleLogout}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-slate-500 hover:text-red-500 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </nav>
  )
}
