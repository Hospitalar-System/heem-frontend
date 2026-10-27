import type { UserRole } from '@/features/auth/types'

export interface SettingsSection {
  label: string
  to: string
  /** Mesma regra de papel que a guarda da rota já aplicava antes da reorganização. */
  canAccess: (roles: readonly UserRole[]) => boolean
}

const isTenantAdmin = (roles: readonly UserRole[]) => roles.includes('admin_cliente')
const isTenantOrPlatformAdmin = (roles: readonly UserRole[]) => roles.includes('admin_cliente') || roles.includes('super_admin')

export const settingsSections: SettingsSection[] = [
  { label: 'Categorias', to: '/settings/categories', canAccess: isTenantAdmin },
  { label: 'Política de SLA', to: '/settings/sla-policy', canAccess: isTenantAdmin },
  { label: 'Importação em lote', to: '/settings/imports', canAccess: isTenantAdmin },
  { label: 'Usuários e papéis', to: '/settings/users', canAccess: isTenantOrPlatformAdmin },
]

export function getSettingsSections(roles: readonly UserRole[]) {
  return settingsSections.filter((section) => section.canAccess(roles))
}

export function canSeeSettings(roles: readonly UserRole[]) {
  return getSettingsSections(roles).length > 0
}
