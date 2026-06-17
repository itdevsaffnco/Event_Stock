import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
const AdminLayout = lazy(() => import('@/components/admin/layout/AdminLayout'))
const StaffLayout = lazy(() => import('@/components/staff/layout/StaffLayout'))

// Auth
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// Admin pages
const DashboardPage      = lazy(() => import('@/pages/admin/DashboardPage'))
const WarehousesPage     = lazy(() => import('@/pages/admin/WarehousesPage'))
const EventsPage         = lazy(() => import('@/pages/admin/EventsPage'))
const EventDetailPage    = lazy(() => import('@/pages/admin/EventDetailPage'))
const UsersPage             = lazy(() => import('@/pages/admin/UsersPage'))
const WarehouseStockPage    = lazy(() => import('@/pages/admin/WarehouseStockPage'))

// Staff pages
const StaffHomePage  = lazy(() => import('@/pages/staff/StaffHomePage'))
const StaffEventPage = lazy(() => import('@/pages/staff/StaffEventPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AdminGuard() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/staff" replace />
  return <Outlet />
}

function StaffGuard() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'staff') return <Navigate to="/admin" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>,
  },
  {
    path: '/forgot-password',
    element: <Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>,
  },
  {
    path: '/reset-password',
    element: <Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>,
  },
  {
    path: '/admin',
    element: <AdminGuard />,
    children: [
      {
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',         element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense> },
          { path: 'warehouses',        element: <Suspense fallback={<PageLoader />}><WarehousesPage /></Suspense> },
          { path: 'events',            element: <Suspense fallback={<PageLoader />}><EventsPage /></Suspense> },
          { path: 'events/:eventId',   element: <Suspense fallback={<PageLoader />}><EventDetailPage /></Suspense> },
          { path: 'users',                              element: <Suspense fallback={<PageLoader />}><UsersPage /></Suspense> },
          { path: 'warehouses/:warehouseId/stocks',    element: <Suspense fallback={<PageLoader />}><WarehouseStockPage /></Suspense> },
        ],
      },
    ],
  },
  {
    path: '/staff',
    element: <StaffGuard />,
    children: [
      {
        element: (
          <Suspense fallback={<PageLoader />}>
            <StaffLayout />
          </Suspense>
        ),
        children: [
          { index: true,               element: <Suspense fallback={<PageLoader />}><StaffHomePage /></Suspense> },
          { path: 'events/:eventId',   element: <Suspense fallback={<PageLoader />}><StaffEventPage /></Suspense> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
