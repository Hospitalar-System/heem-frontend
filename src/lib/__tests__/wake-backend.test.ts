import { afterEach, describe, expect, it, vi } from 'vitest'
import { backendOrigin, resetWakeBackendForTests, wakeBackend } from '../wake-backend'

vi.mock('../demo-mode', () => ({ isDemoMode: false }))

describe('backendOrigin', () => {
  it('extrai a origem do VITE_API_BASE_URL', () => {
    expect(backendOrigin('https://heem-backend.onrender.com/api/v1')).toBe('https://heem-backend.onrender.com')
  })
  it('é nulo sem URL ou com URL inválida', () => {
    expect(backendOrigin(undefined)).toBeNull()
    expect(backendOrigin('não é url')).toBeNull()
  })
})

describe('wakeBackend', () => {
  afterEach(() => { resetWakeBackendForTests(); vi.unstubAllEnvs() })

  it('dispara um GET no-cors em /actuator/health, sem credenciais, uma única vez', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://heem-backend.onrender.com/api/v1')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null))
    wakeBackend(fetchMock as unknown as typeof fetch)
    wakeBackend(fetchMock as unknown as typeof fetch)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://heem-backend.onrender.com/actuator/health', expect.objectContaining({ mode: 'no-cors', credentials: 'omit' }))
  })

  it('ignora falha de rede sem lançar', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://heem-backend.onrender.com/api/v1')
    const fetchMock = vi.fn().mockRejectedValue(new Error('rede'))
    expect(() => wakeBackend(fetchMock as unknown as typeof fetch)).not.toThrow()
    await Promise.resolve()
  })

  it('não faz nada sem VITE_API_BASE_URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const fetchMock = vi.fn()
    wakeBackend(fetchMock as unknown as typeof fetch)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
