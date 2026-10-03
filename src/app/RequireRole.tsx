import { useSyncExternalStore } from 'react'
import { Navigate } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { getRoleLandingPath } from '@/features/auth/hooks/useLogin'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'

export function RequireRole({ role, children }: PropsWithChildren<{ role?: UserRole }>) {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)

  if (!auth.isAuthenticated || !auth.user) return <Navigate to="/login" replace />
  if (role && !auth.user.roles.includes(role)) {
    return <Navigate to={getRoleLandingPath(auth.user.roles) ?? '/login'} replace />
  }

  return children
}
