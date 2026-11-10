import { AuthError } from './auth-error'
import type { AuthProvider } from './auth-provider'
import { loginWithPassword, logoutSession, refreshTokens } from './keycloak'

// Adaptador do Keycloak: delega ao cliente atual, sem mudar comportamento.
// Recuperação e redefinição de senha não existem aqui (ficam no console do Keycloak).
export const keycloakProvider: AuthProvider = {
  name: 'keycloak',
  supportsPasswordReset: false,
  signIn: (credentials, options) => loginWithPassword(credentials, options),
  refresh: (refreshToken) => refreshTokens(refreshToken),
  signOut: ({ refreshToken }) => logoutSession(refreshToken),
  requestPasswordReset: () => Promise.reject(new AuthError('unsupported')),
  updatePassword: () => Promise.reject(new AuthError('unsupported')),
}
