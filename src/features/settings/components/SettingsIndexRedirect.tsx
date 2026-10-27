import { useSyncExternalStore } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { getSettingsSections } from '../access'

/** `/settings` leva para a primeira subtela permitida ao papel. */
export function SettingsIndexRedirect() {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const location = useLocation()
  const first = getSettingsSections(auth.user?.roles ?? [])[0]
  return <Navigate to={first ? { pathname: first.to, search: location.search, hash: location.hash } : '/access-denied'} replace />
}
