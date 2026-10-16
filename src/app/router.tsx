import { lazy, Suspense, useSyncExternalStore, type PropsWithChildren } from 'react'
import { createBrowserRouter, Link, Navigate, RouterProvider, useLocation } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RequireRole } from './RequireRole'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const HospitalsPage = lazy(() => import('@/features/assets/pages/HospitalsPage').then((module) => ({ default: module.HospitalsPage })))
const SectorsPage = lazy(() => import('@/features/assets/pages/SectorsPage').then((module) => ({ default: module.SectorsPage })))
const UsersPage = lazy(() => import('@/features/tenants-users/pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const ClientsPage = lazy(() => import('@/features/tenants/pages/ClientsPage').then((module) => ({ default: module.ClientsPage })))
const PlatformUsersPage = lazy(() => import('@/features/platform-users/pages/PlatformUsersPage').then((module) => ({ default: module.PlatformUsersPage })))
const AssetsPage = lazy(() => import('@/features/assets/pages/AssetsPage').then((module) => ({ default: module.AssetsPage })))
const EquipmentFormPage = lazy(() => import('@/features/assets/pages/EquipmentFormPage').then((module) => ({ default: module.EquipmentFormPage })))
const EquipmentDetailPage = lazy(() => import('@/features/assets/pages/EquipmentDetailPage').then((module) => ({ default: module.EquipmentDetailPage })))
const ReportsPage = lazy(() => import('@/features/dashboard/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const TicketsPage = lazy(() => import('@/features/maintenance/pages/TicketsPage').then((module) => ({ default: module.TicketsPage })))
const TicketDetailPage = lazy(() => import('@/features/maintenance/pages/TicketDetailPage').then((module) => ({ default: module.TicketDetailPage })))
const WorkOrdersPage = lazy(() => import('@/features/maintenance/pages/WorkOrdersPage').then((module) => ({ default: module.WorkOrdersPage })))
const WorkOrderDetailPage = lazy(() => import('@/features/maintenance/pages/WorkOrderDetailPage').then((module) => ({ default: module.WorkOrderDetailPage })))
const ChecklistsPage = lazy(() => import('@/features/maintenance/pages/ChecklistsPage').then((module) => ({ default: module.ChecklistsPage })))

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/platform/clients', element: <RequireRole role="super_admin"><Suspense fallback={<DashboardRouteLoading />}><ClientsPage /></Suspense></RequireRole> },
  { path: '/platform/users', element: <RequireRole role="super_admin"><Suspense fallback={<DashboardRouteLoading />}><PlatformUsersPage /></Suspense></RequireRole> },
  { path: '/hospitals', element: <RequireRole><Suspense fallback={<DashboardRouteLoading />}><HospitalsPage /></Suspense></RequireRole> },
  { path: '/sectors', element: <RequireRole><Suspense fallback={<DashboardRouteLoading />}><SectorsPage /></Suspense></RequireRole> },
  { path: '/assets', element: <RequireRole><RequireEquipmentRole><Suspense fallback={<DashboardRouteLoading />}><AssetsPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/assets/new', element: <RequireRole><RequireEquipmentRole editorOnly><Suspense fallback={<DashboardRouteLoading />}><EquipmentFormPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/assets/:id/edit', element: <RequireRole><RequireEquipmentRole editorOnly><Suspense fallback={<DashboardRouteLoading />}><EquipmentFormPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/assets/:id', element: <RequireRole><RequireEquipmentRole><Suspense fallback={<DashboardRouteLoading />}><EquipmentDetailPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/users', element: <RequireRole role="admin_cliente"><Suspense fallback={<DashboardRouteLoading />}><UsersPage /></Suspense></RequireRole> },
  { path: '/reports', element: <RequireRole role="admin_cliente"><Suspense fallback={<DashboardRouteLoading />}><ReportsPage /></Suspense></RequireRole> },
  { path: '/access-denied', element: <AccessDeniedRoute /> },
  { path: '/tickets', element: <RequireTicketListAccess><Suspense fallback={<DashboardRouteLoading />}><TicketsPage /></Suspense></RequireTicketListAccess> },
  { path: '/tickets/:id', element: <RequireTicketAccess><Suspense fallback={<DashboardRouteLoading />}><TicketDetailPage /></Suspense></RequireTicketAccess> },
  { path: '/work-orders', element: <RequireRole role="admin_cliente"><Suspense fallback={<DashboardRouteLoading />}><WorkOrdersPage /></Suspense></RequireRole> },
  { path: '/work-orders/new', element: <RequireRole role="admin_cliente"><Suspense fallback={<DashboardRouteLoading />}><WorkOrdersPage /></Suspense></RequireRole> },
  { path: '/work-orders/:id', element: <RequireRole role="admin_cliente"><Suspense fallback={<DashboardRouteLoading />}><WorkOrderDetailPage /></Suspense></RequireRole> },
  { path: '/checklists', element: <RequireRole role="admin_cliente"><Suspense fallback={<DashboardRouteLoading />}><ChecklistsPage /></Suspense></RequireRole> },
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

function AccessDeniedRoute() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-6 text-center text-text-primary">
      <div className="max-w-md rounded-lg border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold">Acesso não permitido</h1>
        <p className="mt-2 text-sm text-text-secondary">Seu perfil não tem permissão para acessar esta área.</p>
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

function RequireEquipmentRole({ children, editorOnly = false }: PropsWithChildren<{ editorOnly?: boolean }>) {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const roles = auth.user?.roles ?? []
  const allowed = editorOnly
    ? roles.includes('admin_cliente')
    : roles.includes('admin_cliente') || roles.includes('tecnico')
  return allowed ? children : <Navigate to="/access-denied" replace />
}

function RequireTicketListAccess({ children }: PropsWithChildren) {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  if (!auth.isAuthenticated || !auth.user) return <Navigate to="/login" replace />
  return auth.user.roles.includes('admin_cliente') ? children : <Navigate to="/access-denied" replace />
}

function RequireTicketAccess({ children }: PropsWithChildren) {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  if (!auth.isAuthenticated || !auth.user) return <Navigate to="/login" replace />
  const canReadTicket = auth.user.roles.some((role) => ['admin_cliente', 'tecnico', 'interno_hospital'].includes(role))
  return canReadTicket ? children : <Navigate to="/access-denied" replace />
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
