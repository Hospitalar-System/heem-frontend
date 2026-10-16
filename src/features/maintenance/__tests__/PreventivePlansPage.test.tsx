import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { PreventivePlansPage } from '../pages/PreventivePlansPage'

function renderRoute() {
  return render(<MemoryRouter initialEntries={['/preventive-plans']}><Routes>
    <Route path="/preventive-plans" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><PreventivePlansPage /></RequireRole>} />
    <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
    <Route path="/work-orders" element={<h1>Ordens de trabalho</h1>} />
  </Routes></MemoryRouter>)
}

vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

describe('PreventivePlansPage', () => {
  beforeEach(() => {
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
  })

  afterEach(() => clearAuthSession())

  it('clearly exposes the backend dependency and does not claim a plan exists', () => {
    renderRoute()
    expect(screen.getByRole('heading', { name: 'Planos preventivos' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('dependem das Stories 9.1 e 9.2 do backend')
    expect(screen.getByRole('heading', { name: 'Planos serão exibidos aqui' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo plano' })).toBeDisabled()
  })

  it('links to existing work orders without implying they are recurring plans', async () => {
    const user = userEvent.setup()
    renderRoute()
    await screen.findByRole('heading', { name: 'Planos preventivos' })
    await user.click(screen.getByRole('link', { name: 'Consultar ordens de trabalho' }))
    expect(await screen.findByRole('heading', { name: 'Ordens de trabalho' })).toBeInTheDocument()
  })

  it('denies other roles and hides the menu link', () => {
    setAuthSession('token', { id: 'technician-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
    renderRoute()
    expect(screen.getByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Planos preventivos' })).not.toBeInTheDocument()
  })
})
