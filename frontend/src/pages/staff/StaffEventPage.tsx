import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Minus, ShoppingBag, FlaskConical, Truck,
  X, CheckCircle2, AlertCircle, Search, ChevronDown, Package, ShoppingCart,
} from 'lucide-react'
import { staffApi } from '@/api/staff/staff.api'
import type { EventStock } from '@/types'

const today = () => new Date().toISOString().slice(0, 10)

const TYPE_CONFIG = {
  penjualan: {
    label: 'Penjualan', icon: ShoppingBag,
    gradient: 'from-emerald-500 to-teal-500',
    activeBtn: 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200',
    idleBtn: 'border-slate-200 text-slate-500 bg-white hover:border-emerald-200 hover:text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    submit: 'from-emerald-500 to-teal-500 shadow-emerald-200',
    ring: 'focus:ring-emerald-400',
    cartBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  tester: {
    label: 'Tester', icon: FlaskConical,
    gradient: 'from-amber-500 to-orange-500',
    activeBtn: 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200',
    idleBtn: 'border-slate-200 text-slate-500 bg-white hover:border-amber-200 hover:text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    submit: 'from-amber-500 to-orange-500 shadow-amber-200',
    ring: 'focus:ring-amber-400',
    cartBg: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  pengiriman: {
    label: 'Kirim Barang', icon: Truck,
    gradient: 'from-blue-500 to-indigo-500',
    activeBtn: 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200',
    idleBtn: 'border-slate-200 text-slate-500 bg-white hover:border-blue-200 hover:text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    submit: 'from-blue-500 to-indigo-500 shadow-blue-200',
    ring: 'focus:ring-blue-400',
    cartBg: 'bg-blue-50 border-blue-200 text-blue-800',
  },
} as const
type TxType = keyof typeof TYPE_CONFIG

type CartItem = {
  tempId: string
  event_stock_id: number
  sku_name: string
  qty: number
  qty_max: number
  type: 'penjualan' | 'tester'
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      Menyimpan...
    </span>
  )
}

function EmptyStorePlaceholder() {
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
      <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-sm text-slate-400">Pilih store untuk melihat daftar produk</p>
    </div>
  )
}

// ── Custom Select ─────────────────────────────────────────────────────────────
function CustomSelect({
  value, onChange, options, placeholder, error, accentRing,
}: {
  value: number | undefined
  onChange: (v: number) => void
  options: { value: number; label: string }[]
  placeholder: string
  error?: string
  accentRing: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full h-11 flex items-center justify-between px-4 rounded-2xl border-2 bg-white text-sm transition-all focus:outline-none ${
          open ? `${accentRing} border-transparent ring-2` : error ? 'border-red-400' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={selected ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center px-4 py-3 text-sm text-left transition-colors hover:bg-slate-50 ${
                opt.value === value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
              } ${i > 0 ? 'border-t border-slate-50' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-2.5 flex-shrink-0 ${opt.value === value ? 'bg-indigo-500' : 'bg-transparent'}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

// ── Product Picker ────────────────────────────────────────────────────────────
function ProductPicker({
  stocks, value, onChange, error, accentRing,
}: {
  stocks: EventStock[]
  value: number
  onChange: (id: number) => void
  error?: string
  accentRing: string
}) {
  const [search, setSearch] = useState('')
  useEffect(() => { if (!value) setSearch('') }, [value])
  const filtered = stocks.filter(s => !search || s.sku_name.toLowerCase().includes(search.toLowerCase()))
  const selected = stocks.find(s => s.id === value)

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">
        Pilih Produk <span className="text-red-500">*</span>
      </p>
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama produk..."
          className={`w-full h-11 pl-10 pr-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${accentRing} focus:bg-white focus:border-transparent transition-all`}
        />
      </div>
      <div className="space-y-2 max-h-52 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="py-6 text-center">
            <Package className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Produk tidak ditemukan</p>
          </div>
        )}
        {filtered.map(s => {
          const isSelected = s.id === value
          const isEmpty = s.qty_current === 0
          const isLow = s.qty_current > 0 && s.qty_current <= 5
          return (
            <button
              key={s.id}
              type="button"
              disabled={isEmpty}
              onClick={() => onChange(s.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected ? 'border-indigo-400 bg-indigo-50 shadow-sm shadow-indigo-100' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="min-w-0 flex-1 mr-3">
                <p className={`text-sm font-semibold leading-snug break-words ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {s.sku_name}
                </p>
                {s.sku_code && <p className="text-xs text-slate-400 mt-0.5">{s.sku_code}</p>}
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums ${
                  isEmpty ? 'bg-red-100 text-red-600' : isLow ? 'bg-orange-100 text-orange-600' : isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {s.qty_current}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">pcs</p>
              </div>
            </button>
          )
        })}
      </div>
      {selected && selected.qty_current > 0 && selected.qty_current <= 5 && (
        <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-200">
          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-xs text-orange-700 font-medium">Stok hampir habis — tersisa {selected.qty_current} pcs</p>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

// ── Qty Stepper ───────────────────────────────────────────────────────────────
function QtyStepper({
  value, onChange, max, error, accentRing,
}: {
  value: number
  onChange: (v: number) => void
  max?: number
  error?: string
  accentRing: string
}) {
  const safe = isNaN(value) ? 0 : value
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">
        Jumlah (QTY) <span className="text-red-500">*</span>
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, safe - 1))}
          disabled={safe <= 1}
          className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Minus className="w-5 h-5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={safe || ''}
          onChange={e => onChange(Number(e.target.value))}
          className={`flex-1 h-14 rounded-2xl border-2 bg-white text-3xl font-bold text-center text-slate-800 focus:outline-none focus:ring-2 ${accentRing} transition-all ${error ? 'border-red-400' : 'border-slate-200 focus:border-transparent'}`}
        />
        <button
          type="button"
          onClick={() => onChange(max ? Math.min(max, safe + 1) : safe + 1)}
          disabled={!!max && safe >= max}
          className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {max !== undefined && <p className="text-xs text-slate-400 mt-1.5 text-center">Maks. {max} pcs tersedia</p>}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

// ── Transaction Sheet ─────────────────────────────────────────────────────────
function TransactionSheet({
  eventId, stores, onClose,
}: {
  eventId: number
  stores: { id: number; name: string; warehouse_id: number }[]
  onClose: () => void
}) {
  const qc = useQueryClient()

  // ── Shared ────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<TxType>('penjualan')
  const [storeId, setStoreId] = useState<number | undefined>()
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState<{ type: TxType; count: number; qty: number } | null>(null)

  // ── Cart (penjualan / tester) ─────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([])
  const [pickerStockId, setPickerStockId] = useState<number>(0)
  const [pickerQty, setPickerQty] = useState<number>(1)

  // ── Pengiriman ────────────────────────────────────────────
  const [toStoreId, setToStoreId] = useState<number | undefined>()
  const [pengStockId, setPengStockId] = useState<number>(0)
  const [pengQty, setPengQty] = useState<number>(1)
  const [refNo, setRefNo] = useState('')

  const isPengiriman = selectedType === 'pengiriman'
  const cfg = TYPE_CONFIG[selectedType]
  const destinationStores = stores.filter(s => s.id !== storeId)

  // ── Stocks ────────────────────────────────────────────────
  const { data: rawStocks = [], isFetching: stocksLoading } = useQuery({
    queryKey: ['staff-stocks-form', eventId, storeId],
    queryFn: () => staffApi.getStocks(eventId, storeId!).then(r => r.data.data),
    enabled: !!storeId,
  })

  // Sum all cart qty for a stock across all types
  const cartQtyFor = (stockId: number) =>
    cart.filter(c => c.event_stock_id === stockId).reduce((s, c) => s + c.qty, 0)

  const pickerStocks: EventStock[] = rawStocks.map(s => ({
    ...s,
    qty_current: s.qty_current - cartQtyFor(s.id),
  }))

  const getAvailableQty = (stockId: number) => {
    const s = rawStocks.find(r => r.id === stockId)
    return s ? s.qty_current - cartQtyFor(stockId) : 0
  }

  // ── Handlers ──────────────────────────────────────────────
  const handleTypeChange = (t: TxType) => {
    const switchingMode = (t === 'pengiriman') !== isPengiriman
    setSelectedType(t)
    if (switchingMode) {
      setCart([])
      setPickerStockId(0)
      setPickerQty(1)
      setPengStockId(0)
      setPengQty(1)
    }
    setSubmitError('')
  }

  const handleStoreChange = (id: number) => {
    setStoreId(id)
    setCart([])
    setPickerStockId(0)
    setPengStockId(0)
    setSubmitError('')
  }

  const addToCart = () => {
    if (!pickerStockId) return
    const stock = rawStocks.find(s => s.id === pickerStockId)
    if (!stock) return
    const currentType = selectedType as 'penjualan' | 'tester'
    // Merge if same product + same type already in cart
    const existing = cart.findIndex(c => c.event_stock_id === pickerStockId && c.type === currentType)
    if (existing >= 0) {
      setCart(cart.map((c, i) => i === existing ? { ...c, qty: c.qty + pickerQty } : c))
    } else {
      setCart(prev => [...prev, {
        tempId: `${pickerStockId}-${Date.now()}`,
        event_stock_id: pickerStockId,
        sku_name: stock.sku_name,
        qty: pickerQty,
        qty_max: stock.qty_current,
        type: currentType,
      }])
    }
    setPickerStockId(0)
    setPickerQty(1)
  }

  const removeFromCart = (tempId: string) => setCart(c => c.filter(i => i.tempId !== tempId))

  // ── Mutations ─────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['staff-stocks', eventId] })
    qc.invalidateQueries({ queryKey: ['staff-stocks-form', eventId] })
  }

  const bulkMutation = useMutation({
    mutationFn: async () => {
      // Group cart items by type and submit each group
      const groups = cart.reduce<Record<string, { event_stock_id: number; qty: number }[]>>((acc, item) => {
        if (!acc[item.type]) acc[item.type] = []
        acc[item.type].push({ event_stock_id: item.event_stock_id, qty: item.qty })
        return acc
      }, {})
      for (const [type, items] of Object.entries(groups)) {
        await staffApi.createLogBulk(eventId, {
          type: type as 'penjualan' | 'tester',
          store_id: storeId!,
          logged_at: date,
          notes: notes || undefined,
          items,
        })
      }
    },
    onSuccess: () => {
      const totalQty = cart.reduce((s, c) => s + c.qty, 0)
      invalidate()
      setDone({ type: selectedType, count: cart.length, qty: totalQty })
      setTimeout(() => { setDone(null); onClose() }, 1800)
    },
    onError: (err: unknown) => {
      setSubmitError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan. Coba lagi.')
    },
  })

  const pengMutation = useMutation({
    mutationFn: () => staffApi.createLog(eventId, {
      event_stock_id: pengStockId,
      type: 'pengiriman',
      qty: pengQty,
      to_store_id: toStoreId,
      notes: notes || undefined,
      reference_no: refNo || undefined,
      logged_at: date,
    }),
    onSuccess: () => {
      invalidate()
      setDone({ type: 'pengiriman', count: 1, qty: pengQty })
      setTimeout(() => { setDone(null); onClose() }, 1800)
    },
    onError: (err: unknown) => {
      setSubmitError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan. Coba lagi.')
    },
  })

  const isSubmitting = bulkMutation.isPending || pengMutation.isPending
  const canSubmitPeng = !!pengStockId && pengQty > 0 && !!toStoreId && !!storeId
  const totalCartQty = cart.reduce((s, c) => s + c.qty, 0)

  // ── Done screen ───────────────────────────────────────────
  if (done) {
    const dc = TYPE_CONFIG[done.type]
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${dc.gradient} flex items-center justify-center shadow-lg`}>
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">Transaksi Tersimpan!</p>
          <p className="text-sm text-slate-400 mt-1">
            {done.type === 'pengiriman'
              ? `${done.qty} pcs berhasil dikirim`
              : `${done.count} produk · ${done.qty} pcs berhasil dicatat`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Input Transaksi</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isPengiriman ? 'Transfer stok antar store' : 'Tambah beberapa produk sekaligus'}
          </p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
        {/* ① Date + Store */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Tanggal <span className="text-red-500">*</span>
            </p>
            <input
              type="date"
              max={today()}
              value={date}
              onChange={e => setDate(e.target.value)}
              className={`w-full h-11 px-3 rounded-2xl border-2 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 ${cfg.ring} focus:border-transparent transition-all border-slate-200`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {isPengiriman ? 'Store Asal' : 'Store'} <span className="text-red-500">*</span>
            </p>
            <CustomSelect
              value={storeId}
              onChange={handleStoreChange}
              options={stores.map(s => ({ value: s.id, label: s.name }))}
              placeholder="— Pilih —"
              accentRing={cfg.ring}
            />
          </div>
        </div>

        {/* ② Type */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tipe Transaksi</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TYPE_CONFIG) as [TxType, typeof TYPE_CONFIG[TxType]][]).map(([val, c]) => (
              <button
                key={val}
                type="button"
                onClick={() => handleTypeChange(val)}
                className={`flex flex-col items-center gap-2 px-2 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${selectedType === val ? c.activeBtn : c.idleBtn}`}
              >
                <c.icon className="w-5 h-5" />
                <span className="text-xs font-bold leading-tight text-center">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ③ Pengiriman form */}
        {isPengiriman && (
          <>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Store Tujuan <span className="text-red-500">*</span>
              </p>
              <CustomSelect
                value={toStoreId}
                onChange={setToStoreId}
                options={destinationStores.map(s => ({ value: s.id, label: s.name }))}
                placeholder="— Pilih Store —"
                accentRing="focus:ring-blue-400"
              />
            </div>
            {storeId ? (
              stocksLoading
                ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
                : <ProductPicker stocks={rawStocks} value={pengStockId} onChange={id => { setPengStockId(id); setPengQty(1) }} accentRing={cfg.ring} />
            ) : <EmptyStorePlaceholder />}
            {pengStockId > 0 && (
              <QtyStepper value={pengQty} onChange={setPengQty} max={rawStocks.find(s => s.id === pengStockId)?.qty_current} accentRing={cfg.ring} />
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                No. Referensi <span className="text-slate-400 font-normal normal-case">(opsional)</span>
              </p>
              <input
                type="text"
                placeholder="SJ-20260521-001"
                value={refNo}
                onChange={e => setRefNo(e.target.value)}
                className="w-full h-11 px-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
          </>
        )}

        {/* ③ Cart mode (penjualan / tester) */}
        {!isPengiriman && (
          <>
            {/* Cart list */}
            {cart.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Produk Ditambahkan ({cart.length})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCart([]); setPickerStockId(0); setPickerQty(1) }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Hapus Semua
                  </button>
                </div>
                <div className="space-y-2">
                  {cart.map(item => {
                    const itemCfg = TYPE_CONFIG[item.type]
                    return (
                      <div key={item.tempId} className="flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.sku_name}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${itemCfg.badge}`}>
                            {itemCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className="text-sm font-bold tabular-nums text-slate-700">{item.qty} pcs</span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.tempId)}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-slate-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Divider + Add product */}
            <div className={cart.length > 0 ? 'border-t border-slate-100 pt-4' : ''}>
              {cart.length > 0 && (
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  + Tambah Produk Lagi
                </p>
              )}
              {storeId ? (
                stocksLoading
                  ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
                  : <ProductPicker
                      stocks={pickerStocks}
                      value={pickerStockId}
                      onChange={id => { setPickerStockId(id); setPickerQty(1) }}
                      accentRing={cfg.ring}
                    />
              ) : <EmptyStorePlaceholder />}

              {pickerStockId > 0 && (
                <>
                  <div className="mt-4">
                    <QtyStepper
                      value={pickerQty}
                      onChange={setPickerQty}
                      max={getAvailableQty(pickerStockId)}
                      accentRing={cfg.ring}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={pickerQty < 1 || getAvailableQty(pickerStockId) < pickerQty}
                    className={`w-full h-11 mt-3 rounded-2xl font-semibold text-sm text-white bg-gradient-to-r ${cfg.submit} shadow-md transition-all active:scale-[0.98] disabled:opacity-50`}
                  >
                    + Tambah Produk
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Catatan <span className="text-slate-400 font-normal normal-case">(opsional)</span>
          </p>
          <textarea
            rows={2}
            placeholder="Tambahkan catatan..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition-all"
          />
        </div>

        {submitError && (
          <div className="flex items-center gap-2.5 p-3.5 bg-red-50 rounded-2xl border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}
      </div>

      {/* Submit footer */}
      <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-slate-100 bg-white">
        {isPengiriman ? (
          <>
            {canSubmitPeng && pengStockId > 0 && (
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl mb-3 ${cfg.badge}`}>
                <p className="text-xs font-semibold truncate flex-1 mr-2">
                  {rawStocks.find(s => s.id === pengStockId)?.sku_name}
                </p>
                <span className="text-xs font-bold flex-shrink-0">{pengQty} pcs</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => pengMutation.mutate()}
              disabled={isSubmitting || !canSubmitPeng}
              className={`w-full h-14 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-60 bg-gradient-to-r ${cfg.submit} shadow-lg`}
            >
              {isSubmitting ? <Spinner /> : 'Simpan Kirim Barang'}
            </button>
          </>
        ) : (
          <>
            {cart.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl mb-3 bg-slate-100 text-slate-700">
                <p className="text-xs font-semibold">{cart.length} produk</p>
                <span className="text-xs font-bold">Total {totalCartQty} pcs</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => bulkMutation.mutate()}
              disabled={isSubmitting || cart.length === 0 || !storeId}
              className={`w-full h-14 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] disabled:opacity-60 bg-gradient-to-r ${cfg.submit} shadow-lg`}
            >
              {isSubmitting
                ? <Spinner />
                : cart.length > 0
                  ? `Simpan ${cart.length} Produk (${totalCartQty} pcs)`
                  : 'Simpan'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffEventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [stockSearch, setStockSearch] = useState('')

  const { data: eventData } = useQuery({
    queryKey: ['staff-event', eventId],
    queryFn: () => staffApi.getEventDetail(Number(eventId)).then(r => r.data),
  })

  const { data: stocks = [] } = useQuery({
    queryKey: ['staff-stocks', eventId, selectedStoreId],
    queryFn: () => staffApi.getStocks(Number(eventId), selectedStoreId!).then(r => r.data.data),
    enabled: !!selectedStoreId,
  })

  const event = eventData?.data
  const stores = eventData?.stores ?? []
  const filteredStocks = stockSearch
    ? stocks.filter(s => s.sku_name.toLowerCase().includes(stockSearch.toLowerCase()))
    : stocks

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-4 pt-10 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/staff')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Event Aktif</p>
            <h1 className="text-sm font-bold text-slate-900 truncate">{event?.name ?? '...'}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-28">
        {/* Store selector */}
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pilih Store</p>
          <div className="relative">
            <select
              value={selectedStoreId ?? ''}
              onChange={e => { setSelectedStoreId(e.target.value ? Number(e.target.value) : null); setStockSearch('') }}
              className="w-full h-10 pl-3.5 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none transition-all"
            >
              <option value="">— Pilih Store —</option>
              {stores.map((s: { id: number; name: string }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Stock list */}
        {selectedStoreId ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                placeholder="Cari nama produk..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
            </div>
            <p className="text-xs text-slate-400 px-0.5">{filteredStocks.length} dari {stocks.length} produk</p>
            {filteredStocks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <Package className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  {stocks.length === 0 ? 'Belum ada stock di store ini' : 'Produk tidak ditemukan'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredStocks.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-slate-100 px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 leading-snug break-words">{s.sku_name}</p>
                      {s.sku_code && <p className="text-xs text-slate-400">{s.sku_code}</p>}
                    </div>
                    <span className={`flex-shrink-0 text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg ${
                      s.qty_current === 0 ? 'bg-red-100 text-red-600' :
                      s.qty_current <= 5 ? 'bg-orange-100 text-orange-600' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {s.qty_current} pcs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Package className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Pilih store untuk melihat stok</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-[76px] right-4 h-11 px-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95 transition-all z-20"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-semibold">Input Transaksi</span>
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-3xl z-40 h-[94dvh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <TransactionSheet
              eventId={Number(eventId)}
              stores={stores}
              onClose={() => setSheetOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
