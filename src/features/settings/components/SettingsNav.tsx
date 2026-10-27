import { useSyncExternalStore } from 'react'
import { NavLink } from 'react-router-dom'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { getSettingsSections } from '../access'

const linkClass = ({ isActive }: { isActive: boolean }) => `inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`

/** Sub-navegação da área de Configurações: mostra só as seções que o papel pode acessar. */
export function SettingsNav() {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const sections = getSettingsSections(auth.user?.roles ?? [])
  if (sections.length === 0) return null

  return <nav aria-label="Configurações" className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-border px-1 pb-3">
    {sections.map(({ label, to }) => <NavLink key={to} to={to} className={linkClass}>{label}</NavLink>)}
  </nav>
}
