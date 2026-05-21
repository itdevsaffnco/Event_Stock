import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Shield, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usersApi } from '@/api/admin/users.api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import type { User } from '@/types'

// ── Schemas ───────────────────────────────────────────────────────────────────
const createSchema = z.object({
  name:     z.string().min(1, 'Nama wajib diisi'),
  email:    z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role:     z.enum(['admin', 'staff']),
})
type CreateData = z.infer<typeof createSchema>

const editSchema = z.object({
  name:     z.string().min(1, 'Nama wajib diisi'),
  email:    z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter').or(z.literal('')).optional(),
  role:     z.enum(['admin', 'staff']),
})
type EditData = z.infer<typeof editSchema>

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
      role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
    }`}>
      <Shield className="w-3 h-3" />
      {role === 'admin' ? 'Admin' : 'Staff'}
    </span>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
      active ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-500'
    }`}>
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

// ── Password Input with Toggle ────────────────────────────────────────────────
function PasswordInput({ label, placeholder, error, ...props }: React.ComponentProps<'input'> & { label: string; error?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className={`w-full h-11 rounded-xl border-2 px-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error ? 'border-red-400' : 'border-slate-200'}`}
        />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Create Form ───────────────────────────────────────────────────────────────
function CreateUserForm({ onSubmit, loading }: { onSubmit: (d: CreateData) => void; loading?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateData>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'staff' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nama Lengkap *" placeholder="Budi Santoso" error={errors.name?.message} {...register('name')} />
      <Input label="Email *" type="email" placeholder="budi@example.com" error={errors.email?.message} {...register('email')} />
      <PasswordInput label="Password *" placeholder="Min. 6 karakter" error={errors.password?.message} {...register('password')} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">Role *</label>
        <div className="grid grid-cols-2 gap-2">
          {(['admin', 'staff'] as const).map(r => (
            <label key={r} className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 transition-colors">
              <input type="radio" value={r} {...register('role')} className="accent-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-800 capitalize">{r}</p>
                <p className="text-xs text-slate-400">{r === 'admin' ? 'Akses penuh' : 'Input transaksi'}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
      </div>
      <Button type="submit" className="w-full" loading={loading}>Buat Akun</Button>
    </form>
  )
}

// ── Edit Form ─────────────────────────────────────────────────────────────────
function EditUserForm({ user, onSubmit, loading }: { user: User; onSubmit: (d: EditData) => void; loading?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditData>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.name, email: user.email, role: user.role, password: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nama Lengkap *" error={errors.name?.message} {...register('name')} />
      <Input label="Email *" type="email" error={errors.email?.message} {...register('email')} />
      <PasswordInput
        label="Password Baru"
        placeholder="Kosongkan jika tidak diubah"
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">Role *</label>
        <div className="grid grid-cols-2 gap-2">
          {(['admin', 'staff'] as const).map(r => (
            <label key={r} className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 transition-colors">
              <input type="radio" value={r} {...register('role')} className="accent-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-800 capitalize">{r}</p>
                <p className="text-xs text-slate-400">{r === 'admin' ? 'Akses penuh' : 'Input transaksi'}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" loading={loading}>Simpan Perubahan</Button>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => usersApi.list({ search, role: roleFilter || undefined }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: CreateData) => usersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false) },
  })

  const editMutation = useMutation({
    mutationFn: (d: EditData) => usersApi.update(editTarget!.id, { ...d, password: d.password || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditTarget(null) },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (user: User) => usersApi.update(user.id, { is_active: !user.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.delete(deleteTarget!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null) },
  })

  const users = data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Akun"
        subtitle="Kelola akun admin dan staff"
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4" /> Tambah Akun
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <div className="flex gap-1">
          {[['', 'Semua'], ['admin', 'Admin'], ['staff', 'Staff']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRoleFilter(val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${roleFilter === val ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {users.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">Belum ada akun.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Nama', 'Email', 'Role', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          {u.id === me?.id && <p className="text-xs text-indigo-500 font-medium">Akun Anda</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{u.email}</td>
                    <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => u.id !== me?.id && toggleActiveMutation.mutate(u)}
                        disabled={u.id === me?.id || toggleActiveMutation.isPending}
                        title={u.id === me?.id ? 'Tidak bisa menonaktifkan akun sendiri' : ''}
                        className="disabled:cursor-not-allowed"
                      >
                        <StatusBadge active={u.is_active} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => u.id !== me?.id && setDeleteTarget(u)}
                          disabled={u.id === me?.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={u.id === me?.id ? 'Tidak bisa menghapus akun sendiri' : 'Hapus'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination info */}
      {data && data.total > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Menampilkan {users.length} dari {data.total} akun
        </p>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Tambah Akun Baru">
        <CreateUserForm
          onSubmit={d => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
        {createMutation.isError && (
          <p className="mt-3 text-xs text-red-500 text-center">
            {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal membuat akun.'}
          </p>
        )}
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Akun">
        {editTarget && (
          <>
            <EditUserForm
              user={editTarget}
              onSubmit={d => editMutation.mutate(d)}
              loading={editMutation.isPending}
            />
            {editMutation.isError && (
              <p className="mt-3 text-xs text-red-500 text-center">
                {(editMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan.'}
              </p>
            )}
          </>
        )}
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Akun?"
        description={`Akun "${deleteTarget?.name}" (${deleteTarget?.email}) akan dihapus permanen.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
