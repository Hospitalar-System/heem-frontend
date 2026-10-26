import { useSyncExternalStore } from 'react'
import { Navigate } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { getRoleLandingPath } from '@/features/auth/hooks/useLogin'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { SessionRestoring } from '@/features/auth/components/SessionRestoring'
import { useAuthRestoring } from '@/features/auth/hooks/useAuthRestoring'
import type { UserRole } from '@/features/auth/types'

export function RequireRole({ role, children, allowPlatformAdmin = true, deniedTo }: PropsWithChildren<{ role?: UserRole; allowPlatformAdmin?: boolean; deniedTo?: string }>) {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const restoring = useAuthRestoring()

  if (restoring) return <SessionRestoring />
  if (!auth.isAuthenticated || !auth.user) return <Navigate to="/login" replace />
  const isPlatformAdmin = allowPlatformAdmin && role === 'admin_cliente' && auth.user.roles.includes('super_admin')
  if (role && !auth.user.roles.includes(role) && !isPlatformAdmin) {
    return <Navigate to={deniedTo ?? getRoleLandingPath(auth.user.roles) ?? '/login'} replace />
  }

  return children
}
