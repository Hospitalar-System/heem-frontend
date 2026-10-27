import { NavLink } from 'react-router-dom'

const tabs = [
  { label: 'OTs', to: '/work-orders', end: true },
  { label: 'Rotinas', to: '/work-orders/rotinas', end: false },
  { label: 'Campanhas', to: '/work-orders/campanhas', end: false },
]

const linkClass = ({ isActive }: { isActive: boolean }) => `inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`

/** Abas do grupo Ordens de Trabalho: OTs, Rotinas (planos preventivos) e Campanhas. */
export function WorkOrdersTabs() {
  return <nav aria-label="Ordens de Trabalho" className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-border px-1 pb-3">
    {tabs.map(({ label, to, end }) => <NavLink key={to} to={to} end={end} className={linkClass}>{label}</NavLink>)}
  </nav>
}
