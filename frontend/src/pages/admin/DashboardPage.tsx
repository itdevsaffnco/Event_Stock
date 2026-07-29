import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, CalendarDays, ShoppingBag, AlertTriangle, Package, Trophy, Calendar, Download, RefreshCw, ChevronDown, Store, X, ArrowDownLeft, ArrowUpRight, FlaskConical, Clock, ChevronLeft, ChevronRight as ChevronRightIcon, Pencil, Trash2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { dashboardApi, eventsApi, exportApi, stockLogsApi } from '@/api/admin/events.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'

function formatRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n}`
}

// Pakai komponen tanggal lokal browser, bukan toISOString() (yang konversi ke UTC dan
// bisa mundur satu hari untuk WIB dini hari) - supaya shortcut tanggal tidak salah "hari ini".
function toYMD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type Shortcut = 'today' | '7d' | '30d' | 'month' | 'custom'
const SHORTCUTS: { key: Shortcut; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7d',    label: '7 Hari'   },
  { key: '30d',   label: '30 Hari'  },
  { key: 'month', label: 'Bulan Ini'},
]

function shortcutDates(key: Shortcut): { from: string; to: string } {
  const today = new Date()
  const to    = toYMD(today)
  if (key === 'today') return { from: to, to }
  if (key === '7d')    return { from: toYMD(new Date(Date.now() - 6 * 86400000)), to }
  if (key === '30d')   return { from: toYMD(new Date(Date.now() - 29 * 86400000)), to }
  // month
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: toYMD(first), to }
}

// ── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({
  value, onChange, options, placeholder, icon: Icon,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  options: { value: number; label: string }[]
  placeholder: string
  icon?: React.ElementType
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-xl border text-sm transition-all focus:outline-none ${
          open || value !== undefined
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
        }`}
      >
        {Icon && <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${open || value !== undefined ? 'text-indigo-500' : 'text-slate-400'}`} />}
        <span className={`text-xs font-medium ${selected ? 'text-indigo-700' : 'text-slate-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ml-0.5 transition-transform text-slate-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 min-w-[200px] bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200 z-50 py-1.5 overflow-hidden">
          <button
            onClick={() => { onChange(undefined); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition-colors ${
              value === undefined ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${value === undefined ? 'bg-indigo-500' : 'bg-transparent'}`} />
            {placeholder}
          </button>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition-colors ${
                value === opt.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${value === opt.value ? 'bg-indigo-500' : 'bg-transparent'}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, color, sub,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const init7d = shortcutDates('7d')
  const [activeShortcut, setActiveShortcut] = useState<Shortcut>('7d')
  const [dateFrom, setDateFrom] = useState(init7d.from)
  const [dateTo,   setDateTo]   = useState(init7d.to)
  const [eventId,  setEventId]  = useState<number | undefined>(undefined)
  const [storeId,  setStoreId]  = useState<number | undefined>(undefined)
  const [exporting, setExporting] = useState(false)
  const [logsPage, setLogsPage] = useState(1)
  const [editingLog, setEditingLog] = useState<{ id: number; type: string; qty: number; notes: string | null; reference_no: string | null; logged_at: string } | null>(null)
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null)
  const qc = useQueryClient()

  const applyShortcut = (key: Shortcut) => {
    const d = shortcutDates(key)
    setActiveShortcut(key)
    setDateFrom(d.from)
    setDateTo(d.to)
  }

  const handleFromChange = (v: string) => { setDateFrom(v); setActiveShortcut('custom'); setLogsPage(1) }
  const handleToChange   = (v: string) => { setDateTo(v);   setActiveShortcut('custom'); setLogsPage(1) }

  const dateParams = useMemo(
    () => ({ from: dateFrom, to: dateTo, event_id: eventId, store_id: storeId }),
    [dateFrom, dateTo, eventId, storeId]
  )

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportApi.dashboardSales({ from: dateFrom, to: dateTo, event_id: eventId, store_id: storeId })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_transaksi_${dateFrom}_sd_${dateTo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const invalidateLogs = () => qc.invalidateQueries({ queryKey: ['recent-logs'] })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { qty?: number; notes?: string; reference_no?: string; logged_at?: string } }) =>
      stockLogsApi.update(id, data),
    onSuccess: () => { setEditingLog(null); invalidateLogs() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => stockLogsApi.delete(id),
    onSuccess: () => { setDeletingLogId(null); invalidateLogs() },
  })

  const { data: eventsList } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => eventsApi.list({ }).then(r => r.data.data),
  })

  const { data: storesList } = useQuery({
    queryKey: ['dashboard-stores', eventId],
    queryFn: () => dashboardApi.stores({ event_id: eventId }).then(r => r.data.data),
  })

  const REFRESH_MS = 10_000

  const { data: summary, isFetching: summaryFetching } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then(r => r.data),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const { data: chartData, isFetching: chartFetching, dataUpdatedAt } = useQuery({
    queryKey: ['sales-chart', dateFrom, dateTo, eventId],
    queryFn: () => dashboardApi.salesChart(dateParams).then(r => r.data.data),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  useEffect(() => {
    setCountdown(REFRESH_MS / 1000)
  }, [dataUpdatedAt])
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_MS / 1000 : prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const { data: topSkus } = useQuery({
    queryKey: ['top-skus', dateFrom, dateTo, eventId],
    queryFn: () => dashboardApi.topSkus(dateParams).then(r => r.data.data),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const { data: recentLogsData } = useQuery({
    queryKey: ['recent-logs', dateFrom, dateTo, eventId, storeId, logsPage],
    queryFn: () => dashboardApi.recentLogs({ from: dateFrom, to: dateTo, event_id: eventId, store_id: storeId, page: logsPage, per_page: 10}).then(r => r.data),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  const { data: alertsRaw, isFetching: alertsFetching } = useQuery({
    queryKey: ['stock-alerts', eventId, storeId],
    queryFn: () => dashboardApi.stockAlerts({ threshold: 50, event_id: eventId, store_id: storeId }).then(r => r.data.data),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  })

  // Sort ascending by qty_current (smallest = most urgent first)
  const alerts = useMemo(
    () => alertsRaw ? [...alertsRaw].sort((a, b) => a.qty_current - b.qty_current) : undefined,
    [alertsRaw]
  )

  const isRefreshing = summaryFetching || chartFetching || alertsFetching

  const maxSold = topSkus?.[0]?.total_sold ?? 1

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="Ringkasan aktivitas event stock" />

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          label="Event Aktif"
          value={summary?.total_events_active ?? '—'}
          color="bg-indigo-100 text-indigo-600"
          sub={`dari ${summary?.total_events ?? 0} total event`}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Event"
          value={summary?.total_events ?? '—'}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Penjualan Hari Ini"
          value={summary?.sales_today ?? '—'}
          color="bg-emerald-100 text-emerald-600"
          sub="unit terjual"
        />
        <StatCard
          icon={ShoppingBag}
          label="Penjualan Bulan Ini"
          value={summary?.sales_this_month ?? '—'}
          color="bg-amber-100 text-amber-600"
          sub="unit terjual"
        />
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4 space-y-4">

        {/* Row 1: Periode shortcuts + date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Periode</span>
          </div>

          {/* Shortcut pills */}
          <div className="flex gap-1.5 flex-wrap">
            {SHORTCUTS.map(s => (
              <button
                key={s.key}
                onClick={() => applyShortcut(s.key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  activeShortcut === s.key
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-200" />

          {/* Date range — styled group */}
          <div className="flex items-center gap-0 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <div className="flex items-center gap-1.5 pl-3 pr-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => handleFromChange(e.target.value)}
                className="h-9 text-xs text-slate-700 bg-transparent focus:outline-none w-28"
              />
            </div>
            <span className="text-xs text-slate-400 px-1 font-medium select-none">—</span>
            <div className="flex items-center gap-1.5 pr-3 pl-1">
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={e => handleToChange(e.target.value)}
                className="h-9 text-xs text-slate-700 bg-transparent focus:outline-none w-28"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-50" />

        {/* Row 2: Event + Store dropdowns + active chips + Export */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Filter</span>

          {/* Event */}
          <FilterDropdown
            value={eventId}
            onChange={v => { setEventId(v); setStoreId(undefined); setLogsPage(1) }}
            options={(eventsList ?? []).map(ev => ({ value: ev.id, label: ev.name }))}
            placeholder="Semua Event"
            icon={CalendarDays}
          />

          {/* Store — only if stores are available */}
          {(storesList?.length ?? 0) > 0 && (
            <FilterDropdown
              value={storeId}
              onChange={v => { setStoreId(v); setLogsPage(1) }}
              options={(storesList ?? []).map(s => ({ value: s.id, label: s.name }))}
              placeholder="Semua Store"
              icon={Store}
            />
          )}

          {/* Active filter chips */}
          {(eventId || storeId) && (
            <button
              onClick={() => { setEventId(undefined); setStoreId(undefined); setLogsPage(1) }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
            >
              <X className="w-3 h-3" />
              Reset semua
            </button>
          )}

          <div className="ml-auto">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition-all shadow-sm shadow-emerald-200 hover:shadow-emerald-300"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Mengunduh...' : 'Export Data'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Full-Width Chart ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Grafik Aktivitas Stok</CardTitle>
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs text-slate-400 tabular-nums">
                Refresh dalam <span className="font-semibold text-slate-600">{countdown}s</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData ?? []} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPenjualan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTester" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPengiriman" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={v => {
                  const d = new Date(v)
                  return `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })}`
                }}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                interval={chartData && chartData.length > 14 ? 3 : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelFormatter={v => {
                  const d = new Date(v as string)
                  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
                }}
                formatter={(v, name) => {
                  const labels: Record<string, string> = {
                    penjualan: 'Penjualan', tester: 'Tester', pengiriman: 'Kirim Barang',
                  }
                  return [`${v ?? 0} pcs`, labels[name as string] ?? name]
                }}
              />
              <Legend
                formatter={v => {
                  const labels: Record<string, string> = {
                    penjualan: 'Penjualan', tester: 'Tester', pengiriman: 'Kirim Barang',
                  }
                  return <span className="text-xs text-slate-600">{labels[v] ?? v}</span>
                }}
                wrapperStyle={{ paddingTop: 8 }}
              />
              <Area type="monotone" dataKey="penjualan"  stroke="#10B981" strokeWidth={2} fill="url(#gradPenjualan)"  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="tester"     stroke="#F59E0B" strokeWidth={2} fill="url(#gradTester)"     dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="pengiriman" stroke="#3B82F6" strokeWidth={2} fill="url(#gradPengiriman)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Bottom Row: Top SKU + Stock Alerts ──────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Top 5 SKU — 2/5 */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <CardTitle>Top 5 SKU Terlaris</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {!topSkus?.length ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">Belum ada data penjualan</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {topSkus.slice(0, 5).map((sku, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs font-bold w-5 flex-shrink-0 ${
                          i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-slate-300'
                        }`}>
                          #{i + 1}
                        </span>
                        <p className="text-sm font-medium text-slate-800 truncate">{sku.sku_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-indigo-600">{sku.total_sold} pcs</span>
                        {sku.total_value > 0 && (
                          <p className="text-xs text-slate-400">{formatRupiah(sku.total_value)}</p>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${i === 0 ? 'bg-indigo-500' : 'bg-indigo-300'}`}
                        style={{ width: `${(sku.total_sold / maxSold) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts — 3/5 */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <CardTitle>Stock Menipis</CardTitle>
                {alertsFetching && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
              </div>
              {!!alerts?.length && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                  {alerts.length} item
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {!alerts?.length ? (
              <div className="px-5 py-8 flex flex-col items-center gap-2">
                <Package className="w-8 h-8 text-emerald-300" />
                <p className="text-sm font-medium text-slate-500">Semua stock aman</p>
                <p className="text-xs text-slate-400">Tidak ada item di bawah 50 pcs</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {alerts.map(a => {
                  const withMeta = a as typeof a & { store?: { name: string }; event?: { name: string; code: string } }
                  return (
                    <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.sku_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {withMeta.event && (
                            <span className="text-xs text-indigo-500 font-medium truncate max-w-[140px]">
                              {withMeta.event.name}
                            </span>
                          )}
                          {withMeta.store && (
                            <>
                              <span className="text-slate-300 text-xs">·</span>
                              <span className="text-xs text-slate-400 truncate">{withMeta.store.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-sm font-bold ${
                        a.qty_current === 0
                          ? 'bg-red-100 text-red-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {a.qty_current} pcs
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Recent Transactions ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <CardTitle>Transaksi Terbaru</CardTitle>
            {recentLogsData && (
              <span className="ml-auto text-xs text-slate-400">
                {recentLogsData.total} transaksi
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!recentLogsData?.data?.length ? (
            <div className="px-5 py-8 text-center">
              <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada transaksi</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 whitespace-nowrap">Tanggal & Jam</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">Tipe</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">Produk</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">Store</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">Qty</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">Input oleh</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-400 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentLogsData.data.map(log => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const l = log as any
                      const date = new Date(l.logged_at)
                      const isOutgoing = l.qty < 0
                      const isPengiriman = l.type === 'pengiriman'

                      const typeBadge = isPengiriman
                        ? isOutgoing
                          ? { label: 'Kirim Keluar', cls: 'bg-blue-50 text-blue-700',    icon: ArrowUpRight }
                          : { label: 'Kirim Masuk',  cls: 'bg-violet-50 text-violet-700', icon: ArrowDownLeft }
                        : l.type === 'penjualan'
                          ? { label: 'Penjualan', cls: 'bg-emerald-50 text-emerald-700', icon: ArrowDownLeft }
                          : { label: 'Tester',    cls: 'bg-amber-50 text-amber-700',    icon: FlaskConical }

                      const TypeIcon = typeBadge.icon

                      return (
                        <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="text-xs font-medium text-slate-700">
                              {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge.cls}`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[220px]">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {l.event_stock?.sku_name ?? '-'}
                            </p>
                            {l.event && <p className="text-xs text-slate-400 truncate">{l.event.name}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs text-slate-700">{l.store?.name ?? '-'}</p>
                            {isPengiriman && isOutgoing && l.to_store && (
                              <p className="text-xs text-slate-400">→ {l.to_store.name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`text-sm font-bold ${isOutgoing ? 'text-red-500' : 'text-emerald-600'}`}>
                              {isOutgoing ? '' : '+'}{l.qty}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs text-slate-600">{l.user?.name ?? '-'}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              {l.type !== 'pengiriman' && (
                                <button
                                  onClick={() => setEditingLog({ id: l.id, type: l.type, qty: Math.abs(l.qty), notes: l.notes, reference_no: l.reference_no, logged_at: l.logged_at.slice(0, 10) })}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setDeletingLogId(l.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {recentLogsData.last_page > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
                  <p className="text-xs text-slate-400">
                    Halaman {recentLogsData.current_page} dari {recentLogsData.last_page}
                    <span className="ml-1">({recentLogsData.total} total)</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                      disabled={recentLogsData.current_page === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: recentLogsData.last_page }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === recentLogsData.last_page || Math.abs(p - recentLogsData.current_page) <= 1)
                      .reduce<(number | '...')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) => p === '...'
                        ? <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                        : (
                          <button
                            key={p}
                            onClick={() => setLogsPage(p as number)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-medium transition-colors ${
                              recentLogsData.current_page === p
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )
                    }
                    <button
                      onClick={() => setLogsPage(p => Math.min(recentLogsData.last_page, p + 1))}
                      disabled={recentLogsData.current_page === recentLogsData.last_page}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Modal ──────────────────────────────────────────── */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Edit Transaksi</h3>
              <button onClick={() => setEditingLog(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={editingLog.qty}
                  onChange={e => setEditingLog({ ...editingLog, qty: Number(e.target.value) })}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal</label>
                <input
                  type="date"
                  value={editingLog.logged_at}
                  onChange={e => setEditingLog({ ...editingLog, logged_at: e.target.value })}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">No. Referensi</label>
                <input
                  type="text"
                  value={editingLog.reference_no ?? ''}
                  onChange={e => setEditingLog({ ...editingLog, reference_no: e.target.value })}
                  placeholder="Opsional"
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Catatan</label>
                <textarea
                  rows={2}
                  value={editingLog.notes ?? ''}
                  onChange={e => setEditingLog({ ...editingLog, notes: e.target.value })}
                  placeholder="Opsional"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all"
                />
              </div>
            </div>
            {editMutation.isError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {(editMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan.'}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingLog(null)} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button
                onClick={() => editMutation.mutate({ id: editingLog.id, data: { qty: editingLog.qty, notes: editingLog.notes ?? undefined, reference_no: editingLog.reference_no ?? undefined, logged_at: editingLog.logged_at } })}
                disabled={editMutation.isPending}
                className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {editMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      {deletingLogId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Transaksi?</h3>
              <p className="text-sm text-slate-500 mt-1">Stok akan dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeletingLogId(null)} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingLogId)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
