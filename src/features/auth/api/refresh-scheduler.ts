import { isDemoMode } from '@/lib/demo-mode'
import { getAccessTokenExpiresAt, getAuthState, subscribeAuthState } from '../session'
import { refreshAccessToken } from './token-refresh'

/** Antecedência da renovação em relação à expiração do access token. */
export const REFRESH_LEAD_MS = 60_000
/** Espera inicial antes de tentar de novo após falha transitória; dobra a cada falha até o teto. */
export const REFRESH_RETRY_MS = 30_000
export const REFRESH_RETRY_MAX_MS = 300_000
/** Maior atraso aceito por setTimeout (acima disso dispara na hora). */
export const MAX_TIMER_MS = 2 ** 31 - 1

let failures = 0
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
  const wait = Math.min(delay ?? Math.max(0, expiresAt - REFRESH_LEAD_MS - Date.now()), MAX_TIMER_MS)
  timer = setTimeout(() => {
    timer = null
    // Sucesso: updateAuthTokens notifica e reagenda. Invalid_credentials: a sessão é limpa e o timer cancelado.
    // Falha transitória: tenta de novo mais tarde, sem derrubar a sessão.
    refreshAccessToken().then(
      () => { failures = 0 },
      () => {
        if (!getAuthState().isAuthenticated) return
        const backoff = Math.min(REFRESH_RETRY_MS * 2 ** failures, REFRESH_RETRY_MAX_MS)
        failures += 1
        schedule(backoff)
      },
    )
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
    failures = 0
    unsubscribe()
    document.removeEventListener('visibilitychange', onVisible)
    cancel()
    stop = null
  }
  return stop
}
