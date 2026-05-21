import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ChevronRight, CalendarDays, Check, Warehouse, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { eventsApi } from '@/api/admin/events.api'
import { warehousesApi } from '@/api/admin/warehouses.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EventStatusBadge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatDate } from '@/lib/utils'
import type { Warehouse as WarehouseType, Event } from '@/types'

const schema = z.object({
  name:          z.string().min(1, 'Nama event wajib diisi'),
  warehouse_ids: z.array(z.number()).min(1, 'Pilih minimal satu warehouse'),
  description:   z.string().optional(),
  start_date:    z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Warehouse Multi-Select Card Picker ──────────────────────────────────────
function WarehousePicker({
  warehouses,
  value,
  onChange,
  error,
}: {
  warehouses: WarehouseType[]
  value: number[]
  onChange: (ids: number[]) => void
  error?: string
}) {
  const toggle = (id: number) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        Warehouse Terlibat <span className="text-red-500">*</span>
        <span className="ml-1.5 text-xs font-normal text-slate-400">(pilih satu atau lebih)</span>
      </label>

      {warehouses.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">Tidak ada warehouse aktif tersedia.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {warehouses.map(wh => {
            const selected = value.includes(wh.id)
            return (
              <button
                key={wh.id}
                type="button"
                onClick={() => toggle(wh.id)}
                className={`relative flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                }`}>
                  {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${selected ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {wh.name}
                  </p>
                  {wh.location && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{wh.location}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-indigo-600 font-medium">
          {value.length} warehouse dipilih
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Event Form ───────────────────────────────────────────────────────────────
function EventForm({ onSubmit, loading, error }: { onSubmit: (d: FormData) => void; loading?: boolean; error?: string }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { warehouse_ids: [] },
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: () => warehousesApi.list({ status: 'active' }).then(r => r.data.data),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nama Event" placeholder="Summer Sale 2026" error={errors.name?.message} {...register('name')} />

      <Controller
        name="warehouse_ids"
        control={control}
        render={({ field }) => (
          <WarehousePicker
            warehouses={warehouses}
            value={field.value}
            onChange={field.onChange}
            error={errors.warehouse_ids?.message}
          />
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Tanggal Mulai" type="date" error={errors.start_date?.message} {...register('start_date')} />
        <Input label="Tanggal Selesai" type="date" {...register('end_date')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">Deskripsi</label>
        <textarea
          rows={2}
          placeholder="Keterangan event (opsional)"
          className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
          {...register('description')}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}
      <Button type="submit" className="w-full" loading={loading}>Buat Event</Button>
    </form>
  )
}

// ── Status Filter ────────────────────────────────────────────────────────────
function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {['', 'draft', 'active', 'closed'].map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            value === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {s === '' ? 'Semua' : s === 'draft' ? 'Draft' : s === 'active' ? 'Aktif' : 'Ditutup'}
        </button>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const qc = useQueryClient()
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['events', search, status],
    queryFn: () => eventsApi.list({ search, status: status || undefined }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: FormData) => eventsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); setShowCreate(false); setCreateError('') },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setCreateError(err?.response?.data?.message ?? 'Gagal membuat event. Coba lagi.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.delete(deleteTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      setDeleteTarget(null)
      setDeleteError('')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setDeleteError(err?.response?.data?.message ?? 'Gagal menghapus event.')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="Kelola semua event stock"
        actions={<Button onClick={() => setShowCreate(true)} size="sm"><Plus className="w-4 h-4" />Buat Event</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari event atau kode..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <StatusFilter value={status} onChange={setStatus} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data?.map(ev => (
            <Link key={ev.id} to={`/admin/events/${ev.id}`}>
              <Card className="hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{ev.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">{ev.code}</span>
                        {ev.warehouses && ev.warehouses.length > 0 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <Warehouse className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500">
                              {ev.warehouses.length === 1
                                ? ev.warehouses[0].name
                                : `${ev.warehouses[0].name} +${ev.warehouses.length - 1} lainnya`
                              }
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">{formatDate(ev.start_date)}</p>
                      <p className="text-xs text-slate-400">{ev.event_stocks_count ?? 0} SKU</p>
                    </div>
                    <EventStatusBadge status={ev.status} />
                    <button
                      onClick={e => { e.preventDefault(); setDeleteError(''); setDeleteTarget(ev) }}
                      disabled={ev.status === 'active'}
                      title={ev.status === 'active' ? 'Event aktif tidak bisa dihapus' : 'Hapus event'}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!data?.data?.length && (
            <p className="text-center text-slate-400 py-12">Belum ada event.</p>
          )}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => { setShowCreate(false); setCreateError('') }} title="Buat Event Baru">
        <EventForm onSubmit={d => createMutation.mutate(d)} loading={createMutation.isPending} error={createError} />
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError('') }}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Event?"
        description={`Event "${deleteTarget?.name}" beserta semua data stock-nya akan dihapus permanen.`}
        loading={deleteMutation.isPending}
      >
        {deleteError && (
          <p className="mt-2 text-xs text-red-500 text-center">{deleteError}</p>
        )}
      </ConfirmDialog>
    </div>
  )
}
