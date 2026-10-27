import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'
import { routes } from '../router'

vi.mock('@/features/assets/pages/HospitalsPage', () => ({ HospitalsPage: () => <p>pagina-hospitais</p> }))
vi.mock('@/features/assets/pages/CategoriesPage', () => ({ CategoriesPage: () => <p>pagina-categorias</p> }))
vi.mock('@/features/sla-policy/pages/SlaPolicyPage', () => ({ SlaPolicyPage: () => <p>pagina-sla</p> }))
vi.mock('@/features/imports/pages/BatchImportPage', () => ({ BatchImportPage: () => <p>pagina-importacao</p> }))
vi.mock('@/features/tenants-users/pages/UsersPage', () => ({ UsersPage: () => <p>pagina-usuarios</p> }))
vi.mock('@/features/platform-users/pages/PlatformUsersPage', () => ({ PlatformUsersPage: () => <p>pagina-usuarios-plataforma</p> }))
vi.mock('@/features/maintenance/pages/WorkOrdersPage', () => ({ WorkOrdersPage: () => <p>pagina-ots</p> }))
vi.mock('@/features/maintenance/pages/WorkOrderDetailPage', () => ({ WorkOrderDetailPage: () => <p>pagina-detalhe-ot</p> }))
vi.mock('@/features/maintenance/pages/PreventivePlansPage', () => ({ PreventivePlansPage: () => <p>pagina-rotinas</p> }))
vi.mock('@/features/maintenance/pages/PreventiveCampaignsPage', () => ({ PreventiveCampaignsPage: () => <p>pagina-campanhas</p> }))
vi.mock('@/features/maintenance/pages/PreventiveCampaignFormPage', () => ({ PreventiveCampaignFormPage: () => <p>pagina-nova-campanha</p> }))
vi.mock('@/features/maintenance/pages/PreventiveCampaignDetailPage', () => ({ PreventiveCampaignDetailPage: () => <p>pagina-campanha</p> }))

function Where() {
  const location = useLocation()
  return <><output data-testid="where">{location.pathname}{location.search}{location.hash}</output><Outlet /></>
}

function renderAt(url: string, roles: UserRole[] = ['admin_cliente']) {
  clearAuthSession()
  setAuthSession('token', { id: 'user-1', name: 'Teste', roles, tenantId: 'tenant-1' })
  const router = createMemoryRouter([{ element: <Where />, children: routes }], { initialEntries: [url] })
  return render(<RouterProvider router={router} />)
}

const where = () => screen.getByTestId('where').textContent

afterEach(() => clearAuthSession())

describe('redirecionamento das rotas antigas', () => {
  it.each([
    ['/sectors?hospitalId=h1', '/hospitals?hospitalId=h1', 'pagina-hospitais'],
    ['/categories?q=raio#topo', '/settings/categories?q=raio#topo', 'pagina-categorias'],
    ['/settings/sla?x=1', '/settings/sla-policy?x=1', 'pagina-sla'],
    ['/sla-policy', '/settings/sla-policy', 'pagina-sla'],
    ['/imports?aba=csv', '/settings/imports?aba=csv', 'pagina-importacao'],
    ['/users?busca=ana#lista', '/settings/users?busca=ana#lista', 'pagina-usuarios'],
    ['/preventive-plans?status=ativo', '/work-orders/rotinas?status=ativo', 'pagina-rotinas'],
    ['/preventive-campaigns?p=2', '/work-orders/campanhas?p=2', 'pagina-campanhas'],
    ['/preventive-campaigns/new', '/work-orders/campanhas/new', 'pagina-nova-campanha'],
    ['/preventive-campaigns/camp-1?x=y#h', '/work-orders/campanhas/camp-1?x=y#h', 'pagina-campanha'],
  ])('%s -> %s', async (from, to, page) => {
    renderAt(from)
    expect(await screen.findByText(page)).toBeInTheDocument()
    expect(where()).toBe(to)
  })

  it('/platform-users vai para /platform/users do super_admin', async () => {
    renderAt('/platform-users?x=1', ['super_admin'])
    expect(await screen.findByText('pagina-usuarios-plataforma')).toBeInTheDocument()
    expect(where()).toBe('/platform/users?x=1')
  })
})

describe('/settings', () => {
  it('index do admin_cliente vai para Categorias, preservando query', async () => {
    renderAt('/settings?x=1')
    expect(await screen.findByText('pagina-categorias')).toBeInTheDocument()
    expect(where()).toBe('/settings/categories?x=1')
  })

  it('index do super_admin vai para Usuários e papéis (única subtela permitida)', async () => {
    renderAt('/settings', ['super_admin'])
    expect(await screen.findByText('pagina-usuarios')).toBeInTheDocument()
    expect(where()).toBe('/settings/users')
  })

  it.each([['tecnico'], ['interno_hospital']] as [UserRole][])('index do %s é negado', async (role) => {
    renderAt('/settings', [role])
    await waitFor(() => expect(where()).toBe('/access-denied'))
  })

  it('super_admin não acessa Categorias (regra atual da tela)', async () => {
    renderAt('/settings/categories', ['super_admin'])
    await waitFor(() => expect(where()).toBe('/access-denied'))
  })
})

describe('grupo Ordens de Trabalho', () => {
  it('rotas novas não colidem com /work-orders/:id', async () => {
    const view = renderAt('/work-orders/rotinas')
    expect(await screen.findByText('pagina-rotinas')).toBeInTheDocument()
    view.unmount()
    renderAt('/work-orders/campanhas')
    expect(await screen.findByText('pagina-campanhas')).toBeInTheDocument()
  })

  it('/work-orders/:id continua abrindo o detalhe', async () => {
    renderAt('/work-orders/ot-123')
    expect(await screen.findByText('pagina-detalhe-ot')).toBeInTheDocument()
    expect(where()).toBe('/work-orders/ot-123')
  })

  it('/work-orders continua na lista', async () => {
    renderAt('/work-orders')
    expect(await screen.findByText('pagina-ots')).toBeInTheDocument()
  })
})
