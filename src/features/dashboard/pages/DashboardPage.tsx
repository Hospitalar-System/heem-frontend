import { Menu, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ThemeSwitcher } from '@/app/ThemeSwitcher'
import { useBodyScrollLock } from '@/components/ui/useBodyScrollLock'
import { useDashboardSummary } from '../api/dashboard'
import { DashboardAttention } from '../components/DashboardAttention'
import { DashboardKpis } from '../components/DashboardKpis'
import { DashboardSidebar } from '../components/DashboardSidebar'
import { DashboardEmptyState, DashboardErrorState, DashboardLoadingState } from '../components/DashboardStates'
import { NotificationsPopover } from '../components/NotificationsPopover'
import { RecentTicketsTable } from '../components/RecentTicketsTable'
import { WorkOrdersChart } from '../components/WorkOrdersChart'
import { DashboardContractError, isDashboardSummaryEmpty } from '../types'

export function DashboardPage() {
  const [search, setSearch] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useBodyScrollLock(mobileNavOpen)
  const dashboard = useDashboardSummary()
  const summary = dashboard.data
  const isEmpty = summary ? isDashboardSummaryEmpty(summary) : false

  return (
    <main className="flex min-h-screen w-full bg-bg text-text-primary">
      <div className="sticky top-0 hidden h-screen h-dvh self-start lg:flex">
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
        <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-border bg-bg px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Abrir navegação" onClick={() => setMobileNavOpen(true)} className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary lg:hidden">
              <Menu aria-hidden="true" size={17} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-5 text-text-primary">Dashboard</h1>
              <p className="truncate text-[9px] leading-3 text-text-muted">
                Resumo operacional
              </p>
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

        <div className="min-w-0 flex-1 p-4 md:p-6 xl:px-8 xl:py-7">
          {dashboard.isPending ? <DashboardLoadingState /> : null}
          {dashboard.isError ? <DashboardErrorState kind={dashboard.error instanceof DashboardContractError ? 'contract' : 'network'} onRetry={() => void dashboard.refetch()} /> : null}
          {!dashboard.isPending && !dashboard.isError && isEmpty ? <DashboardEmptyState /> : null}
          {!dashboard.isPending && !dashboard.isError && summary && !isEmpty && (
            <div className="space-y-4 xl:space-y-5">
              <DashboardKpis data={summary} />
              <DashboardAttention data={summary} />
              <WorkOrdersChart data={summary.workOrdersByStatus} />
              <RecentTicketsTable tickets={summary.recentTickets} query={search} />
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
