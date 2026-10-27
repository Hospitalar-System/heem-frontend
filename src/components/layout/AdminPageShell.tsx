import { Menu, Search, X } from 'lucide-react'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { ThemeSwitcher } from '@/app/ThemeSwitcher'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { NotificationsPopover } from '@/features/dashboard/components/NotificationsPopover'
import { isDemoMode } from '@/lib/demo-mode'

export function AdminPageShell({ title, subtitle, action, tabs, children }: PropsWithChildren<{ title: string; subtitle?: string; action?: ReactNode; tabs?: ReactNode }>) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <main className="flex h-[100dvh] min-h-[600px] w-full overflow-hidden border border-border bg-bg text-text-primary md:rounded-2xl">
      <div className="hidden h-full lg:flex"><DashboardSidebar /></div>
      {mobileNavOpen && <div className="fixed inset-0 z-50 flex lg:hidden">
        <button type="button" aria-label="Fechar navegação" onClick={() => setMobileNavOpen(false)} className="absolute inset-0 bg-bg/80" />
        <div className="relative z-10 h-full shadow-xl"><DashboardSidebar onNavigate={() => setMobileNavOpen(false)} />
          <button type="button" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} className="absolute right-2 top-4 grid size-8 place-items-center rounded-md bg-surface"><X size={16} /></button>
        </div>
      </div>}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-border bg-bg px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Abrir navegação" onClick={() => setMobileNavOpen(true)} className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-surface lg:hidden"><Menu size={17} /></button>
            <div className="min-w-0"><h1 className="truncate text-base font-semibold leading-5">{title}</h1>{subtitle && <p className="truncate text-[10px] leading-4 text-text-muted">{subtitle}</p>}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="relative hidden h-[38px] w-[240px] xl:block"><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} /><input type="search" aria-label="Pesquisar" placeholder="Pesquisar" className="h-full w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            {isDemoMode && <span className="hidden rounded-sm border border-warning/40 px-2 py-1 text-[10px] font-medium text-warning sm:inline">Demonstração · dados locais</span>}
            <NotificationsPopover /><ThemeSwitcher />{action}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 xl:px-8 xl:py-7">{tabs}{children}</div>
      </section>
    </main>
  )
}
