import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { clearAuthSession } from '@/features/auth/session'
import { RequireRole } from '../RequireRole'

function LoginProbe() {
  const location = useLocation()
  return <p>login from={String((location.state as { from?: string } | null)?.from)}</p>
}

describe('redirecionamento ao login', () => {
  afterEach(() => clearAuthSession())

  it('sem sessão guarda o destino (caminho, query e hash) ao ir para /login', () => {
    render(
      <MemoryRouter initialEntries={['/assets/abc?aba=documentos#topo']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route path="/assets/:id" element={<RequireRole><p>ficha</p></RequireRole>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login from=/assets/abc?aba=documentos#topo')).toBeInTheDocument()
  })
})
