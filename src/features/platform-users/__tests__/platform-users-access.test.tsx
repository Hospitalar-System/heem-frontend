import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'

function renderRoute(roles: ('super_admin' | 'admin_cliente')[]) {
  setAuthSession('test-token', { id: 'user-1', name: 'Test User', roles })
  return render(<MemoryRouter initialEntries={['/platform/users']}><Routes>
    <Route path="/platform/users" element={<RequireRole role="super_admin"><p>Usuários protegidos</p></RequireRole>} />
    <Route path="/dashboard" element={<CurrentPath />} />
  </Routes></MemoryRouter>)
}

function CurrentPath() {
  const location = useLocation()
  return <p data-testid="current-path">{location.pathname}</p>
}

afterEach(() => clearAuthSession())

describe('F2.3 access control', () => {
  it('allows the Super Admin and shows platform navigation', () => {
    renderRoute(['super_admin'])
    expect(screen.getByText('Usuários protegidos')).toBeInTheDocument()
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Usuários da Plataforma' })).toHaveAttribute('href', '/platform/users')
  })

  it('redirects tenant admins and hides platform navigation', () => {
    renderRoute(['admin_cliente'])
    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard')
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Usuários da Plataforma' })).not.toBeInTheDocument()
  })
})
