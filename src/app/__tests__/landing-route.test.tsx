import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ Toaster: () => null, toast: { error: vi.fn(), success: vi.fn() } }))

async function renderAt(pathname: string) {
  window.history.pushState({}, '', pathname)
  vi.resetModules()
  const [{ AppRouter }, { AppProviders }] = await Promise.all([import('../router'), import('../providers')])
  return render(<AppProviders><AppRouter /></AppProviders>)
}

describe('rota pública /', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('renderiza a landing sem sessão, sem redirecionar para /login', async () => {
    await renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: /A engenharia clínica/ })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('/login continua sendo o login', async () => {
    await renderAt('/login')
    expect(await screen.findByRole('button', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: /A engenharia clínica/ })).not.toBeInTheDocument()
  })

  it('a landing é carregada por import dinâmico (fora do bundle principal)', () => {
    const source = readFileSync(path.resolve(import.meta.dirname, '../router.tsx'), 'utf8')
    expect(source).toMatch(/lazy\(\(\) => import\('@\/features\/landing\/pages\/LandingPage'\)/)
    expect(source).not.toMatch(/^import .*features\/landing/m)
  })
})
