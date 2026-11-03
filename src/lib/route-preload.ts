/** Carregadores dos chunks das rotas do menu: o router usa os mesmos (lazy) e o menu pré-carrega ao passar o mouse/foco. */
export const routeLoaders = {
  '/dashboard': () => import('@/features/dashboard/pages/DashboardPage'),
  '/assets': () => import('@/features/assets/pages/AssetsPage'),
  '/work-orders': () => import('@/features/maintenance/pages/WorkOrdersPage'),
  '/tickets': () => import('@/features/maintenance/pages/TicketsPage'),
  '/checklists': () => import('@/features/maintenance/pages/ChecklistsPage'),
  '/hospitals': () => import('@/features/assets/pages/HospitalsPage'),
  '/reports': () => import('@/features/dashboard/pages/ReportsPage'),
  '/settings': () => import('@/features/assets/pages/CategoriesPage'),
} as const

export function preloadRoute(path: string) {
  const loader = (routeLoaders as Record<string, (() => Promise<unknown>) | undefined>)[path]
  void loader?.().catch(() => undefined)
}
