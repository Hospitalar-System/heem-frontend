export interface AuthTokens {
  accessToken: string
  refreshToken: string
  /** Instante (ms desde a epoch) em que o access token expira. */
  expiresAt: number
}
