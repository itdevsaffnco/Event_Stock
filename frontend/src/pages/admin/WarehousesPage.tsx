import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, MapPin, Package, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { warehousesApi } from '@/api/admin/warehouses.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Warehouse } from '@/types'

// ── Stock Row untuk form inline ──────────────────────────────────────────────
interface StockRow { sku_code: string; sku_name: string; qty_available: number | ''; price: number | '' }
const emptyStockRow = (): StockRow => ({ sku_code: '', sku_name: '', qty_available: '', price: '' })

// ── Zod Schema ───────────────────────────────────────────────────────────────
const warehouseSchema = z.object({
  name:      z.string().min(1, 'Nama wajib diisi'),
  location:  z.string().optional(),
  address:   z.string().optional(),
  pic_name:  z.string().optional(),
  pic_phone: z.string().optional(),
})
type WarehouseFormData = z.infer<typeof warehouseSchema>

// ── Inline Stock Table ────────────────────────────────────────────────────────
function StockInputSection({
  rows,
  onChange,
}: {
  rows: StockRow[]
  onChange: (rows: StockRow[]) => void
}) {
  const updateRow = (i: number, field: keyof StockRow, val: StockRow[typeof field]) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const addRow = () => onChange([...rows, emptyStockRow()])
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 rounded-xl">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 rounded-l-xl">SKU Code</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Nama SKU *</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Qty</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 rounded-r-xl">Harga</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5">
                  <input value={row.sku_code} onChange={e => updateRow(i, 'sku_code', e.target.value)}
                    placeholder="SKU-001"
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.sku_name} onChange={e => updateRow(i, 'sku_name', e.target.value)}
                    placeholder="Nike Air Max"
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} value={row.qty_available}
                    onChange={e => updateRow(i, 'qty_available', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-20 h-9 px-2 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} value={row.price}
                    onChange={e => updateRow(i, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-28 h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </td>
                <td className="px-1 py-1.5">
                  <button onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
        <Plus className="w-4 h-4" /> Tambah Item
      </button>
    </div>
  )
}

// ── Create Warehouse Form (info + optional stock) ─────────────────────────────
function CreateWarehouseForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: WarehouseFormData, stocks: StockRow[]) => void
  loading?: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
  })
  const [showStock, setShowStock] = useState(false)
  const [stockRows, setStockRows] = useState<StockRow[]>([emptyStockRow()])

  return (
    <form onSubmit={handleSubmit(d => onSubmit(d, showStock ? stockRows : []))} className="space-y-4">
      {/* Info Dasar */}
      <Input label="Nama Gudang *" placeholder="Gudang Jakarta Pusat" error={errors.name?.message} {...register('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Lokasi" placeholder="Jakarta Pusat" {...register('location')} />
        <Input label="No. HP PIC" placeholder="0812..." {...register('pic_phone')} />
      </div>
      <Input label="Nama PIC" placeholder="Budi Santoso" {...register('pic_name')} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">Alamat Lengkap</label>
        <textarea rows={2} placeholder="Jl. Sudirman No. 10..." {...register('address')}
          className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white" />
      </div>

      {/* Toggle Stock */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowStock(!showStock)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            Tambah Stock Awal Gudang
            <span className="text-xs font-normal text-slate-400">(opsional)</span>
          </span>
          {showStock ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showStock && (
          <div className="p-4 bg-white border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-3">
              Stock ini akan menjadi katalog referensi gudang. Bisa dipakai sebagai template saat mengisi stock event.
            </p>
            <StockInputSection rows={stockRows} onChange={setStockRows} />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        Buat Gudang
      </Button>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WarehousesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [editInfoTarget, setEditInfoTarget] = useState<Warehouse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', search],
    queryFn: () => warehousesApi.list({ search }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: ({ formData, stocks }: { formData: WarehouseFormData; stocks: StockRow[] }) => {
      const validStocks = stocks.filter(s => s.sku_name)
      return warehousesApi.create({
        ...formData,
        stocks: validStocks.length ? validStocks.map(s => ({
          sku_code: s.sku_code || undefined,
          sku_name: s.sku_name,
          qty_available: s.qty_available === '' ? 0 : s.qty_available as number,
          price: s.price === '' ? undefined : s.price as number,
        })) : undefined,
      })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setShowCreate(false) },
  })

  const updateInfoMutation = useMutation({
    mutationFn: (d: WarehouseFormData) => warehousesApi.update(editInfoTarget!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setEditInfoTarget(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: () => warehousesApi.delete(deleteTarget!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setDeleteTarget(null) },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse"
        subtitle="Kelola gudang dan master stock"
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4" /> Tambah Gudang
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari gudang..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.data?.map(wh => (
            <Card key={wh.id} className="hover:border-indigo-200 transition-colors">
              <CardContent>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{wh.name}</h3>
                    {wh.location && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{wh.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditInfoTarget(wh)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Edit info">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(wh)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span>{wh.stores_count ?? 0} Store</span>
                  <span>{wh.warehouse_stocks_count ?? 0} Produk</span>
                  {wh.pic_name && <span>PIC: {wh.pic_name}</span>}
                </div>

                {/* Tombol kelola stock */}
                <button
                  onClick={() => navigate(`/admin/warehouses/${wh.id}/stocks`)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  Kelola Stock Gudang
                </button>
              </CardContent>
            </Card>
          ))}
          {!data?.data?.length && (
            <p className="col-span-full text-center text-slate-400 py-12">
              Belum ada gudang. Klik "Tambah Gudang" untuk memulai.
            </p>
          )}
        </div>
      )}

      {/* Dialog Buat Gudang */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Tambah Gudang Baru" className="max-w-xl">
        <CreateWarehouseForm
          onSubmit={(formData, stocks) => createMutation.mutate({ formData, stocks })}
          loading={createMutation.isPending}
        />
      </Dialog>

      {/* Dialog Edit Info */}
      <Dialog open={!!editInfoTarget} onClose={() => setEditInfoTarget(null)} title="Edit Gudang">
        {editInfoTarget && (
          <form onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            updateInfoMutation.mutate({
              name: fd.get('name') as string,
              location: fd.get('location') as string || undefined,
              address: fd.get('address') as string || undefined,
              pic_name: fd.get('pic_name') as string || undefined,
              pic_phone: fd.get('pic_phone') as string || undefined,
            })
          }} className="space-y-4">
            <Input label="Nama Gudang *" name="name" defaultValue={editInfoTarget.name} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Lokasi" name="location" defaultValue={editInfoTarget.location ?? ''} />
              <Input label="No. HP PIC" name="pic_phone" defaultValue={editInfoTarget.pic_phone ?? ''} />
            </div>
            <Input label="Nama PIC" name="pic_name" defaultValue={editInfoTarget.pic_name ?? ''} />
            <Button type="submit" className="w-full" loading={updateInfoMutation.isPending}>Simpan</Button>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Gudang?"
        description={`"${deleteTarget?.name}" beserta semua datanya akan dihapus permanen.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
