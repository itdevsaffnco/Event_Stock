import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, useRouteError } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

function ChunkErrorBoundary() {
  const error = useRouteError() as Error
  useEffect(() => {
    if (error?.message?.includes('Failed to fetch dynamically imported module')) {
      window.location.reload()
    }
  }, [error])
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <p className="text-slate-600 text-sm">Memuat halaman...</p>
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}

// Layouts
const AdminLayout = lazy(() => import('@/components/admin/layout/AdminLayout'))
const StaffLayout = lazy(() => import('@/components/staff/layout/StaffLayout'))

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

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
    errorElement: <ChunkErrorBoundary />,
  },
  {
    path: '/admin',
    element: <AdminGuard />,
    errorElement: <ChunkErrorBoundary />,
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
    errorElement: <ChunkErrorBoundary />,
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
