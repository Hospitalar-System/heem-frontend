import { useSyncExternalStore } from 'react'
import { getAuthRestoring, subscribeAuthState } from '../session'

export function useAuthRestoring() {
  return useSyncExternalStore(subscribeAuthState, getAuthRestoring, getAuthRestoring)
}
