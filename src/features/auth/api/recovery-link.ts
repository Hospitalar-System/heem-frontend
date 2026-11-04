// Leitura do link de recuperação/convite do Supabase. Com o fluxo implícito, o Supabase redireciona para
// `/redefinir-senha#access_token=...&refresh_token=...&expires_in=...&type=recovery|invite`, ou, com link
// inválido/expirado, para `#error=access_denied&error_code=otp_expired` (às vezes na query string).

export type RecoveryLink =
  | { status: 'ready'; accessToken: string; kind: 'recovery' | 'invite' }
  | { status: 'invalid' }

/** Função pura: não toca na URL nem em storage. */
export function parseRecoveryLink(location: { hash: string; search: string }): RecoveryLink {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(location.search)
  if (hash.has('error') || hash.has('error_code') || search.has('error') || search.has('error_code')) return { status: 'invalid' }
  const accessToken = hash.get('access_token')
  const type = hash.get('type')
  if (!accessToken || (type !== 'recovery' && type !== 'invite')) return { status: 'invalid' }
  return { status: 'ready', accessToken, kind: type }
}

/** Remove fragmento e query da URL para o token não ficar no histórico nem em referrers. */
export function clearRecoveryUrl() {
  window.history.replaceState(window.history.state, '', window.location.pathname)
}
