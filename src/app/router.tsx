import { lazy, Suspense } from 'react'
import { createBrowserRouter, Link, Navigate, RouterProvider, useLocation } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RequireRole } from './RequireRole'

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const HospitalsPage = lazy(() => import('@/features/assets/pages/HospitalsPage').then((module) => ({ default: module.HospitalsPage })))
const SectorsPage = lazy(() => import('@/features/assets/pages/SectorsPage').then((module) => ({ default: module.SectorsPage })))
const UsersPage = lazy(() => import('@/features/tenants-users/pages/UsersPage').then((module) => ({ default: module.UsersPage })))

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/platform/clients', element: <PendingDashboard audience="administração da plataforma" /> },
  { path: '/hospitals', element: <RequireRole><Suspense fallback={<DashboardRouteLoading />}><HospitalsPage /></Suspense></RequireRole> },
  { path: '/sectors', element: <RequireRole><Suspense fallback={<DashboardRouteLoading />}><SectorsPage /></Suspense></RequireRole> },
  { path: '/users', element: <RequireRole role="admin_cliente"><Suspense fallback={<DashboardRouteLoading />}><UsersPage /></Suspense></RequireRole> },
  {
    path: '/dashboard',
    element: (
      <RequireRole>
        <Suspense fallback={<DashboardRouteLoading />}>
          <DashboardPage />
        </Suspense>
      </RequireRole>
    ),
  },
  { path: '/field', element: <PendingDashboard audience="equipe técnica" /> },
  { path: '/hospital/requests', element: <PendingDashboard audience="solicitações hospitalares" /> },
  { path: '*', element: <UnimplementedRoute /> },
])

function PendingDashboard({ audience }: { audience: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-6 text-center text-text-primary">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold">Acesso confirmado</h1>
        <p className="mt-2 text-sm text-text-secondary">A área de {audience} será disponibilizada nas próximas etapas do HEMM.</p>
        <a href="/login" className="mt-5 inline-block text-sm text-primary underline">Voltar ao login</a>
      </div>
    </main>
  )
}

function UnimplementedRoute() {
  const location = useLocation()
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-6 text-center text-text-primary">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold">Esta área ainda está em desenvolvimento</h1>
        <p className="mt-2 text-sm text-text-secondary">O destino <code className="text-text-primary">{location.pathname}</code> será disponibilizado em uma próxima etapa.</p>
        <Link to="/dashboard" className="mt-5 inline-block text-sm text-primary underline">Voltar ao Dashboard</Link>
      </div>
    </main>
  )
}

function DashboardRouteLoading() {
  return (
    <main aria-busy="true" className="grid min-h-screen place-items-center bg-bg text-text-secondary">
      <span className="text-sm">Abrindo dashboard…</span>
    </main>
  )
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
