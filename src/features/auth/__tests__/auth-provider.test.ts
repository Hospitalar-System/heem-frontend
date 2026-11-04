import { describe, expect, it } from 'vitest'
import { AuthError } from '../api/auth-error'
import { resolveAuthProviderName } from '../api/auth-provider'
import { keycloakProvider } from '../api/keycloak-provider'

describe('seleção do provider', () => {
  it('padrão supabase quando VITE_SUPABASE_URL existe, senão keycloak', () => {
    expect(resolveAuthProviderName({ provider: '', supabaseUrl: 'https://p.supabase.co' })).toBe('supabase')
    expect(resolveAuthProviderName({ provider: '', supabaseUrl: '' })).toBe('keycloak')
    expect(resolveAuthProviderName({})).toBe('keycloak')
  })

  it('VITE_AUTH_PROVIDER explícito tem precedência; valor desconhecido cai no padrão', () => {
    expect(resolveAuthProviderName({ provider: 'keycloak', supabaseUrl: 'https://p.supabase.co' })).toBe('keycloak')
    expect(resolveAuthProviderName({ provider: 'supabase', supabaseUrl: '' })).toBe('supabase')
    expect(resolveAuthProviderName({ provider: 'outro', supabaseUrl: 'https://p.supabase.co' })).toBe('supabase')
  })

  it('o adaptador Keycloak não suporta recuperação de senha', async () => {
    expect(keycloakProvider.supportsPasswordReset).toBe(false)
    await expect(keycloakProvider.requestPasswordReset('a@b.com')).rejects.toBeInstanceOf(AuthError)
    await expect(keycloakProvider.updatePassword('t', 'abcdefgh')).rejects.toMatchObject({ kind: 'unsupported' })
  })
})
