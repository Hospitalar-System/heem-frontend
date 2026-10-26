import { isDemoMode } from '@/lib/demo-mode'
import { getAccessTokenExpiresAt, getAuthState, subscribeAuthState } from '../session'
import { refreshAccessToken } from './token-refresh'

/** Antecedência da renovação em relação à expiração do access token. */
export const REFRESH_LEAD_MS = 60_000
/** Espera antes de tentar de novo após falha transitória. */
export const REFRESH_RETRY_MS = 30_000

let timer: ReturnType<typeof setTimeout> | null = null
let stop: (() => void) | null = null

function cancel() {
  if (timer !== null) clearTimeout(timer)
  timer = null
}

function schedule(delay?: number) {
  cancel()
  const expiresAt = getAccessTokenExpiresAt()
  if (!getAuthState().isAuthenticated || expiresAt === null) return
  const wait = delay ?? Math.max(0, expiresAt - REFRESH_LEAD_MS - Date.now())
  timer = setTimeout(() => {
    timer = null
    // Sucesso: updateAuthTokens notifica e reagenda. Invalid_credentials: a sessão é limpa e o timer cancelado.
    // Falha transitória: tenta de novo mais tarde, sem derrubar a sessão.
    refreshAccessToken().catch(() => {
      if (getAuthState().isAuthenticated) schedule(REFRESH_RETRY_MS)
    })
  }, wait)
}

function onVisible() {
  if (document.visibilityState !== 'visible') return
  const expiresAt = getAccessTokenExpiresAt()
  // Timers ficam congelados em aba em segundo plano: se já passou do prazo, renova agora.
  if (getAuthState().isAuthenticated && expiresAt !== null && expiresAt - REFRESH_LEAD_MS <= Date.now()) schedule(0)
}

/** Liga a renovação antecipada à sessão (idempotente). Devolve a função que desliga. Sem efeito em demo. */
export function startRefreshScheduler(): () => void {
  if (isDemoMode) return () => undefined
  if (stop) return stop
  const unsubscribe = subscribeAuthState(() => schedule())
  document.addEventListener('visibilitychange', onVisible)
  schedule()
  stop = () => {
    unsubscribe()
    document.removeEventListener('visibilitychange', onVisible)
    cancel()
    stop = null
  }
  return stop
}
