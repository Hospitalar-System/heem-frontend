import { Menu, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ThemeSwitcher } from '@/app/ThemeSwitcher'
import { DashboardKpis } from '../components/DashboardKpis'
import { DashboardSidebar } from '../components/DashboardSidebar'
import { DashboardEmptyState, DashboardErrorState, DashboardLoadingState } from '../components/DashboardStates'
import { MtbfChart } from '../components/MtbfChart'
import { NotificationsPopover } from '../components/NotificationsPopover'
import { RecentTicketsTable } from '../components/RecentTicketsTable'
import { WorkOrdersChart } from '../components/WorkOrdersChart'
import { dashboardDemoData } from '../data/dashboard.demo'

export type DashboardViewState = 'default' | 'loading' | 'empty' | 'error'

/**
 * The default route currently presents Figma sample data until the dashboard
 * aggregation endpoint and DTO are confirmed with the backend.
 */
export function DashboardPage({ state = 'default' }: { state?: DashboardViewState }) {
  const [search, setSearch] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <main className="flex h-[100dvh] min-h-[600px] w-full overflow-hidden border border-border bg-bg text-text-primary md:rounded-2xl">
      <div className="hidden h-full lg:flex">
        <DashboardSidebar />
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Fechar navegação" onClick={() => setMobileNavOpen(false)} className="absolute inset-0 bg-bg/80" />
          <div className="relative z-10 h-full shadow-xl">
            <DashboardSidebar onNavigate={() => setMobileNavOpen(false)} />
            <button type="button" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} className="absolute right-2 top-4 grid size-8 place-items-center rounded-md bg-surface text-text-primary"><X size={16} /></button>
          </div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-border bg-bg px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Abrir navegação" onClick={() => setMobileNavOpen(true)} className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary lg:hidden">
              <Menu aria-hidden="true" size={17} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-5 text-text-primary">Dashboard</h1>
              <p className="truncate text-[9px] leading-3 text-text-muted">{dashboardDemoData.tenantName} · {dashboardDemoData.hospitalCount} hospitais</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label className="relative hidden h-[38px] w-[280px] xl:block">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="search"
                aria-label="Buscar equipamento, OT ou chamado"
                placeholder="Buscar equipamento, OT, chamado…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-full w-full rounded-md border border-border bg-surface pl-8 pr-3 text-[10px] text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <NotificationsPopover />
            <ThemeSwitcher />
            <Link to="/work-orders/new" className="inline-flex h-[38px] items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 text-[10px] font-semibold text-bg-brand outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary">
              <Plus aria-hidden="true" size={13} /> Nova OT
            </Link>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 xl:px-8 xl:py-7">
          {state === 'loading' ? <DashboardLoadingState /> : null}
          {state === 'empty' ? <DashboardEmptyState /> : null}
          {state === 'error' ? <DashboardErrorState onRetry={() => window.location.reload()} /> : null}
          {state === 'default' && (
            <div className="space-y-4 xl:space-y-5">
              <DashboardKpis data={dashboardDemoData} />
              <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
                <WorkOrdersChart data={dashboardDemoData.workOrdersByStatus} />
                <MtbfChart data={dashboardDemoData.mtbfBySector} />
              </div>
              <RecentTicketsTable tickets={dashboardDemoData.recentTickets} query={search} />
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
