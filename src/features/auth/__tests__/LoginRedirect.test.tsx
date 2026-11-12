import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '@/app/theme-provider'
import { clearAuthSession, setAuthSession } from '../session'
import { LoginPage } from '../pages/LoginPage'

function renderLogin(from?: unknown) {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: from === undefined ? undefined : { from } }]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<p>painel</p>} />
            <Route path="/assets/:id" element={<p>ficha</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('LoginPage com sessão e destino', () => {
  afterEach(() => clearAuthSession())

  it('volta ao destino interno guardado', () => {
    setAuthSession('tok', { id: 'u1', name: 'Ana', roles: ['admin_cliente'], tenantId: null })
    renderLogin('/assets/abc')
    expect(screen.getByText('ficha')).toBeInTheDocument()
  })

  it('ignora destino externo e vai ao painel do papel', () => {
    setAuthSession('tok', { id: 'u1', name: 'Ana', roles: ['admin_cliente'], tenantId: null })
    renderLogin('https://evil.example')
    expect(screen.getByText('painel')).toBeInTheDocument()
  })
})
