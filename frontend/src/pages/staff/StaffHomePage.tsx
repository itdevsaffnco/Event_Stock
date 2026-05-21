import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { staffApi } from '@/api/staff/staff.api'
import { useAuthStore } from '@/store/authStore'
import { EventStatusBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import saffLogo from '@/assets/Assets_Saff/Saffnco_logo.png'

export default function StaffHomePage() {
  const { user } = useAuthStore()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['staff-events'],
    queryFn: () => staffApi.getActiveEvents().then(r => r.data.data),
  })

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-10 pb-5 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <img src={saffLogo} alt="Saff & Co." className="h-7 w-auto object-contain" />
          <div className="text-right">
            <p className="text-xs text-slate-500">Selamat datang,</p>
            <p className="text-sm font-bold text-slate-900">{user?.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Event Aktif</h2>
          <p className="text-sm text-slate-500 mt-0.5">Pilih event untuk mulai input transaksi</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="font-medium text-slate-500">Belum ada event aktif</p>
            <p className="text-sm text-slate-400 mt-1">Hubungi admin untuk mengaktifkan event</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <Link key={ev.id} to={`/staff/events/${ev.id}`}>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{ev.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {ev.warehouses && ev.warehouses.length > 0 ? ev.warehouses.map(w => w.name).join(', ') : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <EventStatusBadge status={ev.status} />
                      <span className="text-xs text-slate-400">{formatDate(ev.start_date)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
