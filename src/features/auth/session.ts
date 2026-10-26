import type { AuthState, UserProfileDTO } from './types'

// Chave única do refresh token: sessionStorage por padrão, localStorage só com "lembrar de mim".
// O access token fica apenas em memória; usuário e senha nunca são persistidos.
export const REFRESH_TOKEN_STORAGE_KEY = 'heem.auth.refresh'

let state: AuthState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
}
let refreshToken: string | null = null
let accessTokenExpiresAt: number | null = null
let restoring = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function getAuthState() {
  return state
}

export function subscribeAuthState(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export interface AuthSessionOptions {
  refreshToken?: string
  /** Instante (ms desde a epoch) de expiração do access token. */
  expiresAt?: number
  /** true grava o refresh token em localStorage; false/omitido, em sessionStorage. */
  rememberMe?: boolean
}

export function setAuthSession(accessToken: string, user: UserProfileDTO, options: AuthSessionOptions = {}) {
  state = { accessToken, user, isAuthenticated: true }
  accessTokenExpiresAt = options.expiresAt ?? null
  if (options.refreshToken) {
    refreshToken = options.refreshToken
    storeRefreshToken(options.refreshToken, options.rememberMe ?? false)
  } else {
    refreshToken = null
    removeStoredRefreshToken()
  }
  notify()
}

export function clearAuthSession() {
  state = { accessToken: null, user: null, isAuthenticated: false }
  refreshToken = null
  accessTokenExpiresAt = null
  removeStoredRefreshToken()
  notify()
}

export function getRefreshToken() {
  return refreshToken ?? readStoredRefreshToken()?.token ?? null
}

export function getAccessTokenExpiresAt() {
  return accessTokenExpiresAt
}

/**
 * Aplica o resultado de um refresh. O refresh token é single-use (rotação): grava sempre o novo,
 * no mesmo storage em que o anterior estava, preservando a escolha de "lembrar de mim".
 */
export function updateAuthTokens(tokens: { accessToken: string; refreshToken: string; expiresAt: number }) {
  const remembered = readStoredRefreshToken()?.remembered ?? false
  state = { ...state, accessToken: tokens.accessToken }
  accessTokenExpiresAt = tokens.expiresAt
  refreshToken = tokens.refreshToken
  storeRefreshToken(tokens.refreshToken, remembered)
  notify()
}

/** Lê o refresh token persistido e se ele veio de "lembrar de mim". Tolera storage indisponível. */
export function readStoredRefreshToken(): { token: string; remembered: boolean } | null {
  const session = safeGet(() => window.sessionStorage)
  if (session) return { token: session, remembered: false }
  const local = safeGet(() => window.localStorage)
  if (local) return { token: local, remembered: true }
  return null
}

/** Grava o refresh token em um único storage (o outro é esvaziado). Falha de storage é silenciosa. */
export function storeRefreshToken(token: string, rememberMe: boolean) {
  removeStoredRefreshToken()
  try {
    const target = rememberMe ? window.localStorage : window.sessionStorage
    target.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
  } catch {
    // storage indisponível: o refresh token vale só em memória nesta aba
  }
}

export function getAuthRestoring() {
  return restoring
}

export function setAuthRestoring(value: boolean) {
  if (restoring === value) return
  restoring = value
  notify()
}

function safeGet(storage: () => Storage) {
  try {
    return storage().getItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function removeStoredRefreshToken() {
  for (const storage of [() => window.sessionStorage, () => window.localStorage]) {
    try {
      storage().removeItem(REFRESH_TOKEN_STORAGE_KEY)
    } catch {
      // ignora storage indisponível
    }
  }
}
