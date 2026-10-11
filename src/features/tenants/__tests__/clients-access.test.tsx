import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { setAuthSession } from '@/features/auth/session'

function renderRoute(roles: ('super_admin' | 'admin_cliente')[]) {
  setAuthSession('test-token', { id: 'user-1', name: 'Test User', roles })
  return render(<MemoryRouter initialEntries={['/platform/clients']}>
    <Routes>
      <Route path="/platform/clients" element={<RequireRole role="super_admin"><p>Clientes protegidos</p></RequireRole>} />
      <Route path="/dashboard" element={<CurrentPath />} />
    </Routes>
  </MemoryRouter>)
}

function CurrentPath() {
  const location = useLocation()
  return <p data-testid="current-path">{location.pathname}</p>
}

describe('F2.1 access control', () => {
  it('allows the Super Admin and shows the Clients navigation item', () => {
    renderRoute(['super_admin'])
    expect(screen.getByText('Clientes protegidos')).toBeInTheDocument()

    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/platform/clients')
  })

  it('redirects tenant admins away from the route and hides the Clients navigation item', () => {
    renderRoute(['admin_cliente'])
    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard')

    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Clientes' })).not.toBeInTheDocument()
  })
})
