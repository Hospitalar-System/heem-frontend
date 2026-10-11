import type { AuthState, UserProfileDTO } from './types'

let state: AuthState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
}
const listeners = new Set<() => void>()

export function getAuthState() {
  return state
}

export function subscribeAuthState(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setAuthSession(accessToken: string, user: UserProfileDTO) {
  state = { accessToken, user, isAuthenticated: true }
  listeners.forEach((listener) => listener())
}

export function clearAuthSession() {
  state = { accessToken: null, user: null, isAuthenticated: false }
  listeners.forEach((listener) => listener())
}
