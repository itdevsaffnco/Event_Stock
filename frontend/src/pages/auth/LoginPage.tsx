import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, BarChart3, ShieldCheck, Zap } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/authStore'
import bgLogin from '@/assets/Assets_Saff/Background_login.jpg'
import saffLogo from '@/assets/Assets_Saff/Saffnco_logo.png'

const schema = z.object({
  email:    z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
type FormData = z.infer<typeof schema>

const features = [
  { icon: BarChart3,   text: 'Real-time stock tracking across all events' },
  { icon: ShieldCheck, text: 'Role-based access for admin & staff' },
  { icon: Zap,         text: 'Instant sales & tester logging' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const res = await authApi.login(data.email, data.password)
      setAuth(res.data.user, res.data.token)
      navigate(res.data.user.role === 'admin' ? '/admin' : '/staff', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiError(msg ?? 'Login gagal. Periksa kembali email dan password.')
    }
  }

  return (
    <div className="min-h-dvh flex">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 rounded-tr-3xl rounded-br-3xl overflow-hidden"
        style={{ backgroundImage: `url(${bgLogin})`, backgroundSize: 'cover', backgroundPosition: '50% 15%' }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/55" />
        {/* Subtle gradient on top of image */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-violet-900/30" />

        {/* Brand */}
        <div className="relative z-10">
          <img src={saffLogo} alt="Saff & Co." className="h-12 w-12 object-contain rounded-xl bg-white p-1.5" />
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Manage your<br />
              <span className="text-indigo-200">event inventory</span><br />
              with ease.
            </h2>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Track stock across multiple warehouses, stores, and events — all from one place.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-200" />
                </div>
                <p className="text-sm text-white/80">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs">© 2026 Saff & Co. Event Stock Management</p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden">
            <img src={saffLogo} alt="Saff & Co." className="h-9 w-auto object-contain" />
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full h-11 rounded-xl border bg-slate-50 px-4 text-sm text-slate-800 placeholder:text-slate-400
                  transition-all focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-500 flex items-center gap-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full h-11 rounded-xl border bg-slate-50 px-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400
                    transition-all focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* API error */}
            {apiError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{apiError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all
                disabled:opacity-60 disabled:cursor-not-allowed
                hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-px active:translate-y-0"
              style={{ background: isSubmitting ? '#6366f1' : 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)' }}
            >
              {isSubmitting
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in…
                  </span>
                : 'Sign in'
              }
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400">
            Event Stock Management System
          </p>
        </div>
      </div>

    </div>
  )
}
