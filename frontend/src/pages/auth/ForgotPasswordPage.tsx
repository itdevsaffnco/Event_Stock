import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import saffLogo from '@/assets/Assets_Saff/Saffnco_logo.png'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      await authApi.forgotPassword(data.email)
      setSentEmail(data.email)
      setSent(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? 'Gagal mengirim email. Coba lagi.')
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

          {!sent ? (
            <>
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Lupa Password?</h1>
                <p className="text-sm text-slate-500">
                  Masukkan email akun Anda dan kami akan mengirimkan link untuk mereset password.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    placeholder="email@saffnco.com"
                    autoComplete="email"
                    className={`w-full h-11 rounded-xl border bg-slate-50 px-4 text-sm text-slate-800 placeholder:text-slate-400
                      transition-all focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
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
                  {isSubmitting ? 'Mengirim...' : 'Kirim Link Reset'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <MailCheck className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Email Terkirim!</h2>
                <p className="text-sm text-slate-500">
                  Kami telah mengirimkan link reset password ke:
                </p>
                <p className="text-sm font-semibold text-indigo-600 mt-1">{sentEmail}</p>
              </div>
              <p className="text-xs text-slate-400">
                Cek folder inbox atau spam Anda. Link akan kadaluarsa dalam 60 menit.
              </p>
            </div>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  )
}
