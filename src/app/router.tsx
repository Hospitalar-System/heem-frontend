import { lazy, Suspense, useSyncExternalStore, type PropsWithChildren } from 'react'
import { createBrowserRouter, generatePath, Link, Navigate, RouterProvider, useLocation, useParams } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RequireRole } from './RequireRole'
import { RouteContentFallback } from '@/components/layout/RouteContentFallback'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { SessionRestoring } from '@/features/auth/components/SessionRestoring'
import { useAuthRestoring } from '@/features/auth/hooks/useAuthRestoring'
import { SettingsIndexRedirect } from '@/features/settings/components/SettingsIndexRedirect'

const LandingPage = lazy(() => import('@/features/landing/pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const PoliticaPrivacidadePage = lazy(() => import('@/features/landing/pages/PaginasLegais').then((module) => ({ default: module.PoliticaPrivacidadePage })))
const TermosDeUsoPage = lazy(() => import('@/features/landing/pages/PaginasLegais').then((module) => ({ default: module.TermosDeUsoPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const HospitalsPage = lazy(() => import('@/features/assets/pages/HospitalsPage').then((module) => ({ default: module.HospitalsPage })))
const HospitalDetailPage = lazy(() => import('@/features/assets/pages/HospitalDetailPage').then((module) => ({ default: module.HospitalDetailPage })))
const CategoriesPage = lazy(() => import('@/features/assets/pages/CategoriesPage').then((module) => ({ default: module.CategoriesPage })))
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
const SlaPolicyPage = lazy(() => import('@/features/sla-policy/pages/SlaPolicyPage').then((module) => ({ default: module.SlaPolicyPage })))
const BatchImportPage = lazy(() => import('@/features/imports/pages/BatchImportPage').then((module) => ({ default: module.BatchImportPage })))
const PreventiveRoutinesPage = lazy(() => import('@/features/maintenance/pages/PreventiveRoutinesPage').then((module) => ({ default: module.PreventiveRoutinesPage })))

const PreventiveCampaignsPage = lazy(() => import('@/features/maintenance/pages/PreventiveCampaignsPage').then((module) => ({ default: module.PreventiveCampaignsPage })))
const PreventiveCampaignFormPage = lazy(() => import('@/features/maintenance/pages/PreventiveCampaignFormPage').then((module) => ({ default: module.PreventiveCampaignFormPage })))
const PreventiveCampaignDetailPage = lazy(() => import('@/features/maintenance/pages/PreventiveCampaignDetailPage').then((module) => ({ default: module.PreventiveCampaignDetailPage })))

// eslint-disable-next-line react-refresh/only-export-components -- exportado para os testes de rotas
export const routes = [
  {
    path: '/',
    element: <Suspense fallback={<DashboardRouteLoading />}><LandingPage /></Suspense>,
  },
  { path: '/privacidade', element: <Suspense fallback={<DashboardRouteLoading />}><PoliticaPrivacidadePage /></Suspense> },
  { path: '/termos', element: <Suspense fallback={<DashboardRouteLoading />}><TermosDeUsoPage /></Suspense> },
  { path: '/login', element: <LoginPage /> },
  { path: '/platform/clients', element: <RequireRole role="super_admin"><Suspense fallback={<RouteContentFallback />}><ClientsPage /></Suspense></RequireRole> },
  { path: '/platform/users', element: <RequireRole role="super_admin"><Suspense fallback={<RouteContentFallback />}><PlatformUsersPage /></Suspense></RequireRole> },
  { path: '/hospitals', element: <RequireRole><Suspense fallback={<RouteContentFallback />}><HospitalsPage /></Suspense></RequireRole> },
  { path: '/hospitals/:id', element: <RequireRole><Suspense fallback={<RouteContentFallback />}><HospitalDetailPage /></Suspense></RequireRole> },
  { path: '/sectors', element: <LegacyRedirect to="/hospitals" /> },
  { path: '/assets', element: <RequireRole><RequireEquipmentRole><Suspense fallback={<RouteContentFallback />}><AssetsPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/assets/new', element: <RequireRole><RequireEquipmentRole editorOnly><Suspense fallback={<RouteContentFallback />}><EquipmentFormPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/assets/:id/edit', element: <RequireRole><RequireEquipmentRole editorOnly><Suspense fallback={<RouteContentFallback />}><EquipmentFormPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/assets/:id', element: <RequireRole><RequireEquipmentRole><Suspense fallback={<RouteContentFallback />}><EquipmentDetailPage /></Suspense></RequireEquipmentRole></RequireRole> },
  { path: '/reports', element: <RequireRole role="admin_cliente"><Suspense fallback={<RouteContentFallback />}><ReportsPage /></Suspense></RequireRole> },
  { path: '/settings', element: <SettingsIndexRedirect /> },
  { path: '/settings/categories', element: <RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><Suspense fallback={<RouteContentFallback />}><CategoriesPage /></Suspense></RequireRole> },
  { path: '/settings/sla-policy', element: <RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><Suspense fallback={<RouteContentFallback />}><SlaPolicyPage /></Suspense></RequireRole> },
  { path: '/settings/imports', element: <RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><Suspense fallback={<RouteContentFallback />}><BatchImportPage /></Suspense></RequireRole> },
  { path: '/settings/users', element: <RequireRole role="admin_cliente"><Suspense fallback={<RouteContentFallback />}><UsersPage /></Suspense></RequireRole> },
  // Rotas antigas: mantidas só como redirecionamento (preservam query string e hash).
  { path: '/categories', element: <LegacyRedirect to="/settings/categories" /> },
  { path: '/settings/sla', element: <LegacyRedirect to="/settings/sla-policy" /> },
  { path: '/sla-policy', element: <LegacyRedirect to="/settings/sla-policy" /> },
  { path: '/imports', element: <LegacyRedirect to="/settings/imports" /> },
  { path: '/users', element: <LegacyRedirect to="/settings/users" /> },
  { path: '/platform-users', element: <LegacyRedirect to="/platform/users" /> },
  { path: '/preventive-plans', element: <LegacyRedirect to="/work-orders/rotinas" /> },
  { path: '/preventive-campaigns', element: <LegacyRedirect to="/work-orders/campanhas" /> },
  { path: '/preventive-campaigns/new', element: <LegacyRedirect to="/work-orders/campanhas/new" /> },
  { path: '/preventive-campaigns/:id', element: <LegacyRedirect to="/work-orders/campanhas/:id" /> },
  { path: '/access-denied', element: <AccessDeniedRoute /> },
  { path: '/tickets', element: <RequireTicketListAccess><Suspense fallback={<RouteContentFallback />}><TicketsPage /></Suspense></RequireTicketListAccess> },
  { path: '/tickets/:id', element: <RequireTicketAccess><Suspense fallback={<RouteContentFallback />}><TicketDetailPage /></Suspense></RequireTicketAccess> },
  { path: '/work-orders', element: <RequireRole role="admin_cliente"><Suspense fallback={<RouteContentFallback />}><WorkOrdersPage /></Suspense></RequireRole> },
  { path: '/work-orders/new', element: <RequireRole role="admin_cliente"><Suspense fallback={<RouteContentFallback />}><WorkOrdersPage /></Suspense></RequireRole> },
  { path: '/work-orders/rotinas', element: <RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><Suspense fallback={<RouteContentFallback />}><PreventiveRoutinesPage /></Suspense></RequireRole> },
  { path: '/work-orders/campanhas', element: <RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><Suspense fallback={<RouteContentFallback />}><PreventiveCampaignsPage /></Suspense></RequireRole> },
  { path: '/work-orders/campanhas/new', element: <RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><Suspense fallback={<RouteContentFallback />}><PreventiveCampaignFormPage /></Suspense></RequireRole> },
  { path: '/work-orders/campanhas/:id', element: <RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><Suspense fallback={<RouteContentFallback />}><PreventiveCampaignDetailPage /></Suspense></RequireRole> },
  { path: '/work-orders/:id', element: <RequireRole role="admin_cliente"><Suspense fallback={<RouteContentFallback />}><WorkOrderDetailPage /></Suspense></RequireRole> },
  { path: '/checklists', element: <RequireRole role="admin_cliente"><Suspense fallback={<RouteContentFallback />}><ChecklistsPage /></Suspense></RequireRole> },
  {
    path: '/dashboard',
    element: (
      <RequireRole>
        <Suspense fallback={<RouteContentFallback />}>
          <DashboardPage />
        </Suspense>
      </RequireRole>
    ),
  },
  { path: '/field', element: <PendingDashboard audience="equipe técnica" /> },
  { path: '/hospital/requests', element: <PendingDashboard audience="solicitações hospitalares" /> },
  { path: '*', element: <UnimplementedRoute /> },
]

const router = createBrowserRouter(routes)

function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation()
  const params = useParams()
  return <Navigate to={{ pathname: generatePath(to, params), search, hash }} replace />
}

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
  if (useAuthRestoring()) return <SessionRestoring />
  if (!auth.isAuthenticated || !auth.user) return <Navigate to="/login" replace />
  return auth.user.roles.includes('admin_cliente') ? children : <Navigate to="/access-denied" replace />
}

function RequireTicketAccess({ children }: PropsWithChildren) {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  if (useAuthRestoring()) return <SessionRestoring />
  if (!auth.isAuthenticated || !auth.user) return <Navigate to="/login" replace />
  const canReadTicket = auth.user.roles.some((role) => ['admin_cliente', 'tecnico', 'interno_hospital'].includes(role))
  return canReadTicket ? children : <Navigate to="/access-denied" replace />
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
