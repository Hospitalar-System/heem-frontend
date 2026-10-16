import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getAuthState, subscribeAuthState } from '../session'

export function AuthSessionCacheCleanup() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = subscribeAuthState(() => {
      if (!getAuthState().isAuthenticated) queryClient.clear()
    })
    return () => { unsubscribe() }
  }, [queryClient])

  return null
}
