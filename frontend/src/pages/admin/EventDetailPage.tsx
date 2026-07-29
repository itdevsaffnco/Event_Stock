import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, FileDown, Play, Check, Lock, Download, Square } from 'lucide-react'
import { eventsApi, eventStocksApi, exportApi } from '@/api/admin/events.api'
import { warehousesApi } from '@/api/admin/warehouses.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventStatusBadge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import type { EventStock, Store } from '@/types'

type Tab = 'info' | 'stocks' | 'logs'

// ── Stock Import Section ────────────────────────────────────────────────────
// Saat event masih `draft`, tombol ini re-import seluruh katalog gudang (boleh menimpa
// qty/harga karena belum ada transaksi). Saat event sudah `active`, kita HARUS tidak
// pernah menimpa baris yang sudah ada (recalculateQty bergantung pada stock_logs yang
// sudah tercatat) — jadi hanya SKU yang belum ada di store tsb yang dikirim ke bulkCreate.
function StockImportSection({ eventId, eventStatus, stores, existingStocks }: {
  eventId: number
  eventStatus: string
  stores: Store[]
  existingStocks: EventStock[]
}) {
  const qc = useQueryClient()
  const isDraft = eventStatus === 'draft'
  const [importingId, setImportingId] = useState<number | null>(null)
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})

  const warehouseIds = [...new Set(stores.map(s => s.warehouse_id))]

  const whQueries = useQueries({
    queries: warehouseIds.map(wid => ({
      queryKey: ['warehouse-stocks', wid],
      queryFn: () => warehousesApi.getStocks(wid).then(r => r.data.data),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const stocksByWarehouse: Record<number, { sku_code: string | null; sku_name: string; qty_available: number; price: number | null }[]> = {}
  warehouseIds.forEach((wid, idx) => {
    stocksByWarehouse[wid] = whQueries[idx].data ?? []
  })

  const existingNamesByStore = new Map<number, Set<string>>()
  existingStocks.forEach(s => {
    if (!existingNamesByStore.has(s.store_id)) existingNamesByStore.set(s.store_id, new Set())
    existingNamesByStore.get(s.store_id)!.add(s.sku_name)
  })

  const handleImport = async (store: Store, items: { sku_code: string | null; sku_name: string; qty_available: number; price: number | null }[]) => {
    if (!items.length) return
    setImportingId(store.id)
    setErrors(prev => { const n = { ...prev }; delete n[store.id]; return n })
    try {
      await eventStocksApi.bulkCreate(eventId, items.map(sku => ({
        store_id: store.id,
        sku_code: sku.sku_code || undefined,
        sku_name: sku.sku_name,
        qty_initial: sku.qty_available,
        price: sku.price ?? undefined,
      })))
      qc.invalidateQueries({ queryKey: ['event-stocks', eventId] })
      setDoneIds(prev => new Set([...prev, store.id]))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal import.'
      setErrors(prev => ({ ...prev, [store.id]: msg }))
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {stores.map(store => {
        const catalog = stocksByWarehouse[store.warehouse_id] ?? []
        const loading = whQueries[warehouseIds.indexOf(store.warehouse_id)]?.isFetching
        const existingNames = existingNamesByStore.get(store.id) ?? new Set<string>()
        const missing = catalog.filter(c => !existingNames.has(c.sku_name))
        const itemsToSend = isDraft ? catalog : missing
        const isDone = doneIds.has(store.id)
        const isImporting = importingId === store.id
        const errMsg = errors[store.id]

        return (
          <div key={store.id} className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border-2 transition-colors ${
            isDone ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{store.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {store.warehouse?.name ?? `Warehouse #${store.warehouse_id}`}
                {!loading && isDraft && catalog.length > 0 && ` · ${catalog.length} SKU`}
                {!loading && !isDraft && (missing.length > 0
                  ? ` · ${missing.length} SKU baru dari ${catalog.length} total gudang`
                  : catalog.length > 0 ? ' · Semua SKU sudah tersinkron' : '')}
              </p>
              {errMsg && <p className="text-xs text-red-500 mt-1">{errMsg}</p>}
            </div>
            <Button
              size="sm"
              variant={isDone ? 'outline' : 'primary'}
              onClick={() => handleImport(store, itemsToSend)}
              loading={isImporting || loading}
              disabled={itemsToSend.length === 0}
            >
              {isDraft
                ? (isDone ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Re-import</> : <><Download className="w-3.5 h-3.5" /> Import Stok Gudang</>)
                : <><Download className="w-3.5 h-3.5" /> Tambah {missing.length > 0 ? `${missing.length} ` : ''}SKU Baru</>
              }
            </Button>
          </div>
        )
      })}
    </div>
  )
}

type PendingEdit = { sku_code?: string; sku_name?: string; qty_initial?: number | ''; price?: number | '' }

const PAGE_SIZE = 10

// ── Existing Stocks Table ───────────────────────────────────────────────────
function ExistingStocksTable({ eventId, eventStatus }: { eventId: number; eventStatus: string }) {
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<EventStock | null>(null)
  const [pending, setPending] = useState<Record<number, PendingEdit>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStoreId, setFilterStoreId] = useState<number | ''>('')
  const [page, setPage] = useState(1)

  const isDraft = eventStatus === 'draft'

  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ['event-stocks', eventId],
    queryFn: () => eventStocksApi.list(eventId).then(r => r.data.data),
  })

  // Unique stores for filter dropdown
  const storeOptions = Array.from(
    new Map(stocks.map(s => [s.store_id, s.store?.name ?? `Store #${s.store_id}`])).entries()
  )

  // Filter + search
  const filtered = stocks.filter(s => {
    const matchStore = !filterStoreId || s.store_id === filterStoreId
    const q = search.toLowerCase()
    const matchSearch = !q || s.sku_name.toLowerCase().includes(q) || (s.sku_code ?? '').toLowerCase().includes(q)
    return matchStore && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const resetPage = () => setPage(1)

  const deleteMutation = useMutation({
    mutationFn: () => eventStocksApi.delete(eventId, deleteTarget!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event-stocks', eventId] }); setDeleteTarget(null) },
  })

  const setField = (stockId: number, field: keyof PendingEdit, value: string | number | '') => {
    setPending(prev => ({ ...prev, [stockId]: { ...prev[stockId], [field]: value } }))
  }

  const saveField = async (stock: EventStock) => {
    const edits = pending[stock.id]
    if (!edits) return

    const changed: Partial<EventStock> = {}
    if (edits.sku_name !== undefined && edits.sku_name !== stock.sku_name)
      changed.sku_name = edits.sku_name
    if (edits.sku_code !== undefined && edits.sku_code !== (stock.sku_code ?? ''))
      changed.sku_code = edits.sku_code || null
    if (edits.qty_initial !== undefined && edits.qty_initial !== stock.qty_initial)
      changed.qty_initial = edits.qty_initial === '' ? 0 : edits.qty_initial as number
    if (edits.price !== undefined && edits.price !== (stock.price ?? ''))
      changed.price = edits.price === '' ? null : edits.price as number

    setPending(prev => { const n = { ...prev }; delete n[stock.id]; return n })
    if (!Object.keys(changed).length) return

    setSavingId(stock.id)
    try {
      await eventStocksApi.update(eventId, stock.id, changed)
      qc.invalidateQueries({ queryKey: ['event-stocks', eventId] })
      setSavedIds(prev => new Set([...prev, stock.id]))
      setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(stock.id); return s }), 1800)
    } finally {
      setSavingId(null)
    }
  }

  const cellInput = (
    stock: EventStock,
    field: keyof PendingEdit,
    opts: { type?: 'text' | 'number'; placeholder?: string; className?: string }
  ) => {
    const raw = pending[stock.id]?.[field]
    const value = raw !== undefined ? raw : (field === 'sku_code' ? (stock.sku_code ?? '') : field === 'sku_name' ? stock.sku_name : field === 'qty_initial' ? stock.qty_initial : (stock.price ?? ''))
    return (
      <input
        type={opts.type ?? 'text'}
        min={opts.type === 'number' ? 0 : undefined}
        value={value as string | number}
        onChange={e => setField(stock.id, field, opts.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        onBlur={() => saveField(stock)}
        disabled={savingId === stock.id}
        placeholder={opts.placeholder}
        className={`h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 bg-white ${opts.className ?? 'w-full'}`}
      />
    )
  }

  if (isLoading) return <div className="h-24 bg-slate-50 rounded-xl animate-pulse" />
  if (!stocks.length) return <p className="text-sm text-slate-400 py-4 text-center">Belum ada stock. Import dari warehouse di atas.</p>

  return (
    <>
      {!isDraft && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          Data stock terkunci setelah event diaktifkan
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage() }}
            placeholder="Cari SKU..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>
        <select
          value={filterStoreId}
          onChange={e => { setFilterStoreId(e.target.value ? Number(e.target.value) : ''); resetPage() }}
          className="h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        >
          <option value="">Semua Store</option>
          {storeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <span className="flex items-center text-xs text-slate-400 whitespace-nowrap">
          {filtered.length} dari {stocks.length} item
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Store', 'SKU Code', 'Nama SKU', 'Qty Awal', 'Terjual', 'Tester', 'Sisa', 'Harga', ''].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map(s => {
              const isSaved = savedIds.has(s.id)
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{s.store?.name}</td>

                  {/* SKU Code */}
                  <td className="px-3 py-2 min-w-[7rem]">
                    {isDraft
                      ? cellInput(s, 'sku_code', { placeholder: 'SKU-001', className: 'w-28' })
                      : <span className="text-xs text-slate-500">{s.sku_code || '—'}</span>}
                  </td>

                  {/* Nama SKU */}
                  <td className="px-3 py-2 w-full">
                    {isDraft
                      ? cellInput(s, 'sku_name', { placeholder: 'Nama produk', className: 'w-full min-w-[200px]' })
                      : <span className="text-xs font-medium text-slate-800 whitespace-normal">{s.sku_name}</span>}
                  </td>

                  {/* Qty Awal */}
                  <td className="px-3 py-2 min-w-[5rem]">
                    {isDraft
                      ? cellInput(s, 'qty_initial', { type: 'number', placeholder: '0', className: 'w-20 text-center' })
                      : <span className="text-xs text-center block text-slate-600">{s.qty_initial}</span>}
                  </td>

                  <td className="px-3 py-2 text-xs text-center text-emerald-600 font-medium">{s.qty_sold ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-center text-amber-600 font-medium">{s.qty_tester ?? 0}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-bold ${s.qty_current <= 5 ? 'text-red-500' : 'text-slate-800'}`}>{s.qty_current}</span>
                  </td>

                  {/* Harga */}
                  <td className="px-3 py-2 min-w-[7rem]">
                    {isDraft
                      ? cellInput(s, 'price', { type: 'number', placeholder: '0', className: 'w-28' })
                      : <span className="text-xs text-slate-600">{s.price ? `Rp${Number(s.price).toLocaleString('id')}` : '—'}</span>}
                  </td>

                  <td className="px-3 py-2">
                    {isDraft ? (
                      <div className="flex items-center gap-1">
                        {isSaved && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-200 mx-auto" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400">
            Halaman {safePage} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 text-xs"
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && typeof arr[i-1] === 'number' && (p as number) - (arr[i-1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`e${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-slate-400">…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                    className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${safePage === p ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {p}
                  </button>
              )
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 text-xs"
            >›</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Stock?"
        description={`"${deleteTarget?.sku_name}" akan dihapus.`}
        loading={deleteMutation.isPending}
      />
    </>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('info')
  const [confirmActivate, setConfirmActivate] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(Number(eventId)).then(r => r.data),
  })

  const { data: allStocks = [] } = useQuery({
    queryKey: ['event-stocks', Number(eventId)],
    queryFn: () => eventStocksApi.list(Number(eventId)).then(r => r.data.data),
    enabled: !!eventId,
  })

  const activateMutation = useMutation({
    mutationFn: () => eventsApi.updateStatus(Number(eventId), 'active'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', eventId] }); setConfirmActivate(false) },
  })

  const closeMutation = useMutation({
    mutationFn: () => eventsApi.updateStatus(Number(eventId), 'closed'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['event', eventId] }); setConfirmClose(false) },
  })

  const handleExport = async (type: 'stocks' | 'logs') => {
    const res = type === 'stocks'
      ? await exportApi.stocks(Number(eventId))
      : await exportApi.logs(Number(eventId))
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `export_${data?.data.code}_${type}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
  if (!data) return null

  const { data: event, summary, stores } = data

  // Per-store summary (always based on event stores list, filled from saved stocks)
  const stocksByStore = allStocks.reduce<Record<number, { skuCount: number; totalQty: number }>>((acc, s) => {
    if (!acc[s.store_id]) acc[s.store_id] = { skuCount: 0, totalQty: 0 }
    acc[s.store_id].skuCount++
    acc[s.store_id].totalQty += s.qty_current
    return acc
  }, {})

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info',   label: 'Info' },
    { key: 'stocks', label: 'Stock' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/events')} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 truncate">{event.name}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {event.code}
            {event.warehouses && event.warehouses.length > 0 && ` · ${event.warehouses.map(w => w.name).join(', ')}`}
          </p>
        </div>
        <div className="flex gap-2">
          {event.status === 'draft' && (
            <Button size="sm" onClick={() => setConfirmActivate(true)}>
              <Play className="w-3.5 h-3.5" /> Aktifkan
            </Button>
          )}
          {event.status === 'active' && (
            <Button size="sm" variant="outline" onClick={() => setConfirmClose(true)}>
              <Square className="w-3.5 h-3.5" /> Tutup Event
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleExport('stocks')}>
            <FileDown className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total SKU',   value: summary?.total_skus ?? 0,   color: 'text-indigo-600' },
          { label: 'Terjual',     value: summary?.total_sold ?? 0,   color: 'text-emerald-600' },
          { label: 'Tester',      value: summary?.total_tester ?? 0, color: 'text-amber-600' },
          { label: 'Nilai Stock', value: `Rp${Number(summary?.total_stock_value ?? 0).toLocaleString('id-ID')}`, color: 'text-blue-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-3">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'info' && (
        <Card>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Warehouse Terlibat</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {event.warehouses && event.warehouses.length > 0
                    ? event.warehouses.map(w => (
                        <span key={w.id} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">
                          {w.name}
                        </span>
                      ))
                    : <p className="text-sm font-medium text-slate-800">—</p>
                  }
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dibuat oleh</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{event.creator?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tanggal Mulai</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{formatDate(event.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tanggal Selesai</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{event.end_date ? formatDate(event.end_date) : '—'}</p>
              </div>
            </div>
            {event.description && (
              <div>
                <p className="text-xs text-slate-500">Deskripsi</p>
                <p className="text-sm text-slate-700 mt-0.5">{event.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'stocks' && (
        <div className="space-y-5">
          {/* Per-store summary — always shown when stores exist */}
          {(stores as unknown as Store[]).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(stores as unknown as Store[]).map(st => {
                const stats = stocksByStore[st.id] ?? { skuCount: 0, totalQty: 0 }
                return (
                  <Card key={st.id}>
                    <CardContent className="py-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-700 truncate">{st.name}</p>
                      <p className="text-[10px] text-slate-400 -mt-1 truncate">
                        {st.warehouse?.name ?? `Warehouse #${st.warehouse_id}`}
                      </p>
                      <div className="flex items-end justify-between pt-1">
                        <div>
                          <p className="text-[10px] text-slate-400">Total SKU</p>
                          <p className="text-xl font-bold text-indigo-600">{stats.skuCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Total Qty</p>
                          <p className="text-xl font-bold text-slate-700">{stats.totalQty}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {(event.status === 'draft' || event.status === 'active') && (
            <Card>
              <CardHeader>
                <CardTitle>{event.status === 'draft' ? 'Import Stok dari Warehouse' : 'Tambah SKU Baru dari Warehouse'}</CardTitle>
              </CardHeader>
              <CardContent>
                {event.status !== 'draft' && (
                  <p className="text-xs text-slate-500 -mt-1 mb-3">
                    Event sudah aktif — hanya SKU yang belum ada di masing-masing store yang akan ditambahkan. Stok yang sudah berjalan tidak akan diubah.
                  </p>
                )}
                <StockImportSection
                  eventId={Number(eventId)}
                  eventStatus={event.status}
                  stores={stores as unknown as Store[]}
                  existingStocks={allStocks}
                />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Stock Tersimpan</CardTitle></CardHeader>
            <CardContent>
              <ExistingStocksTable eventId={Number(eventId)} eventStatus={event.status} />
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmActivate}
        onClose={() => setConfirmActivate(false)}
        onConfirm={() => activateMutation.mutate()}
        title="Aktifkan Event?"
        description="Setelah diaktifkan, staff bisa mulai input transaksi."
        confirmLabel="Aktifkan"
        variant="primary"
        loading={activateMutation.isPending}
      />

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => closeMutation.mutate()}
        title="Tutup Event?"
        description="Setelah ditutup, staff tidak bisa input transaksi lagi dan status ini tidak bisa dikembalikan ke aktif."
        confirmLabel="Tutup Event"
        variant="danger"
        loading={closeMutation.isPending}
      />
    </div>
  )
}
