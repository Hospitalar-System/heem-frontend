// Erros tipados comuns a todos os provedores de autenticação (Keycloak, Supabase).

export type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'account_locked'
  | 'rate_limited'
  | 'weak_password'
  | 'invalid_link'
  | 'network'
  | 'timeout'
  | 'unsupported'
  | 'unknown'

const messages: Record<AuthErrorKind, string> = {
  invalid_credentials: 'E-mail ou senha incorretos. Confira os dados e, se o problema continuar, tente novamente em alguns minutos.',
  email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  account_locked: 'Muitas tentativas sem sucesso. Aguarde alguns minutos (até 15) e tente novamente.',
  rate_limited: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  weak_password: 'A senha é fraca demais. Use uma senha mais longa e menos previsível.',
  invalid_link: 'Este link é inválido ou expirou. Solicite um novo link.',
  network: 'Não foi possível conectar ao serviço de login. Verifique sua conexão e tente novamente em instantes.',
  timeout: 'O servidor demorou para responder. Ele pode estar acordando; tente novamente em instantes.',
  unsupported: 'Esta operação não está disponível neste ambiente.',
  unknown: 'Não foi possível concluir a autenticação. Tente novamente.',
}

/** Erro tipado. A mensagem é fixa e nunca carrega senha, tokens ou corpo da requisição. */
export class AuthError extends Error {
  readonly kind: AuthErrorKind

  constructor(kind: AuthErrorKind) {
    super(messages[kind])
    this.name = 'AuthError'
    this.kind = kind
  }
}

/**
 * Converte um fetch/requisição abortado no erro certo: timeout (abortado com AuthError 'timeout' como
 * motivo) vira AuthError; cancelamento do usuário vira AbortError, que a UI trata em silêncio.
 */
export function toAbortError(signal: AbortSignal): Error {
  const reason: unknown = signal.reason
  if (reason instanceof AuthError && reason.kind === 'timeout') return reason
  return new DOMException('Login cancelado.', 'AbortError')
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

