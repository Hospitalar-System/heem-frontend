import {
  Activity,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesColumn,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '@/features/auth/api/logout'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'
import { canSeeSettings } from '@/features/settings/access'

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin_cliente: 'Admin do Cliente',
  tecnico: 'Técnico',
  interno_hospital: 'Interno do Hospital',
}

const navItems = [
  { label: 'Dashboard', to: '/dashboard', Icon: LayoutDashboard },
  { label: 'Equipamentos', to: '/assets', Icon: Package },
  { label: 'Ordens de Trabalho', to: '/work-orders', Icon: ClipboardList },
  { label: 'Chamados de Emergência', to: '/tickets', Icon: Activity },
  { label: 'Checklists', to: '/checklists', Icon: ClipboardCheck },
  { label: 'Hospitais', to: '/hospitals', Icon: Building2 },
  { label: 'Setores', to: '/sectors', Icon: Wrench },
  { label: 'Relatórios', to: '/reports', Icon: ChartNoAxesColumn },
  { label: 'Configurações', to: '/settings', Icon: Settings },
]

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const user = auth.user
  const isSuperAdmin = user?.roles.includes('super_admin') ?? false
  const roleLabel = user?.roles.map((role) => roleLabels[role]).find(Boolean) ?? 'Usuário'
  const displayName = user?.name.trim()
    || user?.email
    || user?.id
    || roleLabel
    || 'Usuário'

  function handleLogout() {
    void logout()
    onNavigate?.()
    navigate('/login', { replace: true })
  }

  return (
    <aside aria-label="Navegação principal" className="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-bg-brand">
      <div className="flex h-[68px] items-center gap-3 px-[22px]">
        <span aria-hidden="true" className="grid size-[34px] place-items-center rounded-[9px] bg-primary text-[17px] font-bold text-bg-brand">H</span>
        <span className="text-[19px] font-bold tracking-tight text-text-primary">HEMM</span>
      </div>

      {isSuperAdmin && <div className="mb-3 mt-3 space-y-1 px-3"><p className="mb-2 px-[14px] text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">Administração</p><NavLink to="/platform/clients" onClick={onNavigate} className={({ isActive }) => `flex min-h-[39px] items-center gap-3 rounded-md px-3 text-[14px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}><BriefcaseBusiness aria-hidden="true" className="size-[14px] shrink-0" strokeWidth={1.8} /><span>Clientes</span></NavLink><NavLink to="/platform/users" onClick={onNavigate} className={({ isActive }) => `flex min-h-[39px] items-center gap-3 rounded-md px-3 text-[14px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}><UsersRound aria-hidden="true" className="size-[14px] shrink-0" strokeWidth={1.8} /><span>Usuários da Plataforma</span></NavLink></div>}
      <p className="mb-2 mt-3 px-[26px] text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted">Operação</p>
      <nav className="space-y-1 px-3">
        {navItems.filter(({ to }) => to !== '/settings' || canSeeSettings(user?.roles ?? [])).map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `flex min-h-[39px] items-center gap-3 rounded-md px-3 text-[14px] font-medium leading-[17px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${isActive ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}
          >
            <Icon aria-hidden="true" className="size-[14px] shrink-0" strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex min-h-[60px] items-center gap-2 border-t border-border px-3">
        <span aria-hidden="true" className="grid size-[34px] shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-bg-brand">{getInitials(displayName)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-semibold text-text-primary">{displayName}</span>
          <span className="block truncate text-[9px] text-text-muted">{roleLabel}</span>
        </span>
        <button type="button" aria-label="Sair" title="Sair" onClick={handleLogout} className="grid size-8 shrink-0 place-items-center rounded-md text-text-secondary outline-none hover:bg-surface hover:text-danger focus-visible:ring-2 focus-visible:ring-primary">
          <LogOut aria-hidden="true" size={15} />
        </button>
      </div>
    </aside>
  )
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase()
  return (words[0] ?? 'U').slice(0, 2).toLocaleUpperCase()
}
