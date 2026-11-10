import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, isAbortError } from '../api/auth-error'
import { loginWithPassword } from '../api/keycloak'
import { supabaseProvider } from '../api/supabase-provider'

vi.mock('@/lib/auth-config', () => ({
  authConfig: { provider: 'supabase', supabaseUrl: 'https://proj.supabase.co', supabaseAnonKey: 'anon-public-key' },
}))

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  // Rejeita como o fetch real quando o signal aborta.
  fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const credentials = { email: 'ana@x.com', password: 'Segredo#123' }
const signIns = [
  ['supabase', (signal: AbortSignal) => supabaseProvider.signIn(credentials, { signal })],
  ['keycloak', (signal: AbortSignal) => loginWithPassword(credentials, { signal })],
] as const

describe.each(signIns)('signIn (%s) com AbortSignal', (_name, signIn) => {
  it('repassa o signal ao fetch', async () => {
    const controller = new AbortController()
    const pending = signIn(controller.signal).catch(() => undefined)
    expect(fetchMock.mock.calls[0][1]!.signal).toBe(controller.signal)
    controller.abort()
    await pending
  })

  it('aborto por timeout vira AuthError timeout, sem vazar a senha', async () => {
    const controller = new AbortController()
    const pending = signIn(controller.signal).catch((e: unknown) => e)
    controller.abort(new AuthError('timeout'))
    const error = await pending
    expect(error).toBeInstanceOf(AuthError)
    expect(error).toMatchObject({ kind: 'timeout' })
    expect((error as Error).message).toBe('O servidor demorou para responder. Ele pode estar acordando; tente novamente em instantes.')
    expect((error as Error).message).not.toContain('Segredo')
  })

  it('cancelamento do usuário vira AbortError, não AuthError', async () => {
    const controller = new AbortController()
    const pending = signIn(controller.signal).catch((e: unknown) => e)
    controller.abort()
    const error = await pending
    expect(isAbortError(error)).toBe(true)
    expect(error).not.toBeInstanceOf(AuthError)
  })
})
