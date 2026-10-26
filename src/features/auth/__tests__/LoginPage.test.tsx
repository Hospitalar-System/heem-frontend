import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme-provider'
import { LoginPage } from '../pages/LoginPage'
import { clearAuthSession, setAuthRestoring, setAuthSession } from '../session'

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))

function CurrentPath() {
  return <p data-testid="current-path">{useLocation().pathname}</p>
}

function renderPage() {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<CurrentPath />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => clearAuthSession())
  afterEach(() => {
    setAuthRestoring(false)
    clearAuthSession()
  })

  it('mostra o formulário para visitante', () => {
    renderPage()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('redireciona ao destino por papel quando já autenticado', () => {
    setAuthSession('access', { id: 'u1', name: 'Ana', roles: ['tecnico'] })
    renderPage()
    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard')
  })

  it('aguarda a restauração sem exibir o formulário e depois redireciona', () => {
    setAuthRestoring(true)
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()

    act(() => {
      setAuthSession('access', { id: 'u1', name: 'Ana', roles: ['tecnico'] })
      setAuthRestoring(false)
    })
    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard')
  })
})
