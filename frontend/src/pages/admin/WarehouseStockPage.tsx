import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, X, FileDown, Upload, Check, AlertCircle, Search } from 'lucide-react'
import { warehousesApi } from '@/api/admin/warehouses.api'
import { Button } from '@/components/ui/button'

interface StockRow { sku_code: string; sku_name: string; qty_available: number | ''; price: number | '' }
const emptyRow = (): StockRow => ({ sku_code: '', sku_name: '', qty_available: '', price: '' })

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += char }
  }
  result.push(current.trim())
  return result
}

export default function WarehouseStockPage() {
  const { warehouseId } = useParams<{ warehouseId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initDone = useRef(false)

  const [rows, setRows] = useState<StockRow[]>([emptyRow()])
  const [ready, setReady] = useState(false)
  const [importError, setImportError] = useState('')
  const [saved, setSaved] = useState(false)
  const [filter, setFilter] = useState('')

  const warehouseIdNum = warehouseId ? Number(warehouseId) : NaN
  const isValidId = !isNaN(warehouseIdNum) && warehouseIdNum > 0

  const { data: warehouseData, isError: warehouseError } = useQuery({
    queryKey: ['warehouse', warehouseIdNum],
    queryFn: () => warehousesApi.get(warehouseIdNum).then(r => r.data.data),
    enabled: isValidId,
    retry: 1,
  })

  const { data: stocks = [], isSuccess, isError: stocksError } = useQuery({
    queryKey: ['warehouse-stocks', warehouseIdNum],
    queryFn: () => warehousesApi.getStocks(warehouseIdNum).then(r => r.data.data),
    enabled: isValidId,
    retry: 1,
  })

  // Reset when navigating to a different warehouse
  useEffect(() => {
    initDone.current = false
    setRows([emptyRow()])
    setReady(false)
  }, [warehouseIdNum])

  useEffect(() => {
    if (isSuccess && !initDone.current) {
      initDone.current = true
      setRows(
        stocks.length
          ? stocks.map(s => ({ sku_code: s.sku_code ?? '', sku_name: s.sku_name, qty_available: s.qty_available, price: (s.price ?? '') as number | '' }))
          : [emptyRow()]
      )
      setReady(true)
    }
  }, [isSuccess, stocks])

  const validRows = rows.filter(r => r.sku_name.trim() !== '')

  const filteredRows = filter.trim()
    ? rows
        .map((r, i) => ({ ...r, _idx: i }))
        .filter(r =>
          r.sku_name.toLowerCase().includes(filter.toLowerCase()) ||
          r.sku_code.toLowerCase().includes(filter.toLowerCase())
        )
    : rows.map((r, i) => ({ ...r, _idx: i }))

  const saveMutation = useMutation({
    mutationFn: () => warehousesApi.bulkUpdateStocks(
      warehouseIdNum,
      validRows.map(r => ({
        sku_code: r.sku_code.trim() || undefined,
        sku_name: r.sku_name.trim(),
        qty_available: r.qty_available === '' ? 0 : Number(r.qty_available),
        price: r.price === '' ? undefined : Number(r.price),
      }))
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-stocks', warehouseIdNum] })
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const updateRow = (i: number, field: keyof StockRow, val: StockRow[typeof field]) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  const addRow = () => setRows(prev => [...prev, emptyRow()])
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))

  const handleExport = () => {
    const name = warehouseData?.name.replace(/[^a-z0-9]/gi, '_') ?? 'gudang'
    const header = 'sku_code,sku_name,qty_available,price'
    const body = validRows.length
      ? validRows.map(r => `${r.sku_code},"${r.sku_name}",${r.qty_available === '' ? 0 : r.qty_available},${r.price === '' ? '' : r.price}`).join('\n')
      : 'SKU-001,"Contoh Produk",10,150000'
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `template_stock_${name}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setImportError('Hanya file .csv yang didukung.'); return }
    const reader = new FileReader()
    reader.onload = evt => {
      const lines = (evt.target?.result as string).replace(/\r/g, '').trim().split('\n').filter(l => l.trim())
      if (lines.length < 2) { setImportError('File kosong atau hanya berisi header.'); return }
      const parsed: StockRow[] = lines.slice(1).map(line => {
        const cols = parseCSVLine(line)
        return {
          sku_code: cols[0] ?? '',
          sku_name: cols[1] ?? '',
          qty_available: cols[2]?.trim() ? Number(cols[2]) || 0 : 0,
          price: (cols[3]?.trim() ? Number(cols[3]) || 0 : '') as number | '',
        }
      }).filter(r => r.sku_name.trim())
      if (!parsed.length) { setImportError('Tidak ada baris valid.'); return }
      initDone.current = true
      setRows(parsed)
      setReady(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const apiError = (warehouseError || stocksError)
    ? 'Gagal memuat data. Pastikan server berjalan dan coba refresh halaman.'
    : ''

  const saveError = saveMutation.isError
    ? ((saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan.')
    : ''

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/admin/warehouses')} className="p-2 rounded-xl hover:bg-slate-100 transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">Kembali ke Warehouse</p>
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {warehouseData?.name ? `Stock — ${warehouseData.name}` : 'Stock Gudang'}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors">
            <FileDown className="w-4 h-4 text-indigo-500" /> Export Template
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors">
            <Upload className="w-4 h-4 text-emerald-500" /> Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={validRows.length === 0 || !ready}
            title={!ready ? 'Menunggu data dimuat...' : validRows.length === 0 ? 'Tidak ada item untuk disimpan' : ''}
          >
            {saved ? <><Check className="w-4 h-4" /> Tersimpan!</> : 'Simpan Stock'}
          </Button>
        </div>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {apiError}
        </div>
      )}

      {/* Import Error */}
      {importError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {importError}
        </div>
      )}

      {/* Filter */}
      {ready && !apiError && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Cari SKU code atau nama..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {filter && (
              <button onClick={() => setFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {filter && (
            <p className="text-sm text-slate-400">
              {filteredRows.length} dari {rows.length} item
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {!ready && !apiError ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : apiError ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Data tidak dapat dimuat.</p>
            <button
              onClick={() => {
                qc.invalidateQueries({ queryKey: ['warehouse', warehouseIdNum] })
                qc.invalidateQueries({ queryKey: ['warehouse-stocks', warehouseIdNum] })
              }}
              className="mt-3 text-xs text-indigo-600 hover:underline font-medium"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-36">SKU Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Nama SKU *</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-28">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-36">Harga</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                        Tidak ada item yang cocok dengan "{filter}"
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(row => {
                      const i = row._idx
                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <input value={row.sku_code} onChange={e => updateRow(i, 'sku_code', e.target.value)}
                              placeholder="SKU-001"
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                          </td>
                          <td className="px-3 py-2">
                            <input value={row.sku_name} onChange={e => updateRow(i, 'sku_name', e.target.value)}
                              placeholder="Nama produk"
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={row.qty_available}
                              onChange={e => updateRow(i, 'qty_available', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="0"
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={row.price}
                              onChange={e => updateRow(i, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="0"
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => removeRow(i)} disabled={rows.length === 1}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-50">
              <button onClick={addRow}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                <Plus className="w-4 h-4" /> Tambah Item
              </button>
            </div>
          </>
        )}
      </div>

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {saveError}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {ready ? `${validRows.length} item siap disimpan` : 'Memuat data...'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/admin/warehouses')}>Kembali</Button>
      </div>
    </div>
  )
}
