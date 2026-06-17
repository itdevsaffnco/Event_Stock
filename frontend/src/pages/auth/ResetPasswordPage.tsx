import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import saffLogo from '@/assets/Assets_Saff/Saffnco_logo.png'

const schema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
  password_confirmation: z.string().min(1, 'Konfirmasi password wajib diisi'),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Konfirmasi password tidak cocok',
  path: ['password_confirmation'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [showPw, setShowPw]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [apiError, setApiError]   = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (!token || !email) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-red-600 font-semibold">Link tidak valid atau sudah kadaluarsa.</p>
          <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">
            Minta link baru
          </Link>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      await authApi.resetPassword({ token, email, password: data.password, password_confirmation: data.password_confirmation })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? 'Gagal mereset password. Token mungkin sudah kadaluarsa.')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <img src={saffLogo} alt="Saff & Co." className="h-9 w-9 object-contain rounded-xl bg-white border border-slate-100 p-1" />
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">Saff & Co.</p>
            <p className="text-xs text-slate-400 leading-tight">Event Stock</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">

          {!success ? (
            <>
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Buat Password Baru</h1>
                <p className="text-sm text-slate-500">Password baru minimal 8 karakter.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`w-full h-11 rounded-xl border bg-slate-50 px-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400
                        transition-all focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                      {...register('password')}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`w-full h-11 rounded-xl border bg-slate-50 px-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400
                        transition-all focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        ${errors.password_confirmation ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                      {...register('password_confirmation')}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password_confirmation && <p className="text-xs text-red-500">{errors.password_confirmation.message}</p>}
                </div>

                {apiError && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    <span className="mt-0.5">⚠</span>
                    <span>{apiError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all
                    disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-200"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Password Berhasil Direset!</h2>
                <p className="text-sm text-slate-500">Anda akan diarahkan ke halaman login...</p>
              </div>
            </div>
          )}

          {!success && (
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
