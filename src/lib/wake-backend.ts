import { isDemoMode } from './demo-mode'

let alreadyWoken = false

/** Origem do backend (sem /api/v1) a partir de VITE_API_BASE_URL; null quando não configurada. */
export function backendOrigin(apiBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL) {
  if (!apiBaseUrl) return null
  try {
    return new URL(apiBaseUrl).origin
  } catch {
    return null
  }
}

/**
 * Acorda o backend (hospedagem gratuita dorme e leva até ~3 min na partida a frio) com um GET
 * sem credenciais em /actuator/health, em segundo plano e no máximo uma vez por visita.
 * Resposta opaca (no-cors): só importa disparar a requisição; erros são ignorados.
 */
export function wakeBackend(fetchImpl: typeof fetch = fetch) {
  if (alreadyWoken || isDemoMode) return
  const origin = backendOrigin()
  if (!origin) return
  alreadyWoken = true
  void fetchImpl(`${origin}/actuator/health`, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).catch(() => undefined)
}

/** Só para testes. */
export function resetWakeBackendForTests() {
  alreadyWoken = false
}
