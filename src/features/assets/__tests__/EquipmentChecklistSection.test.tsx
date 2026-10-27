import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { EquipmentDetailPage } from '../pages/EquipmentDetailPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const base = {
  id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-001', nome: 'Bomba de infusão', modelo: null, numeroSerie: null,
  marca: null, fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'II', statusCicloVida: 'ATIVO', criticidade: 'MEDIA',
  tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: null,
  dataGarantiaFim: null, nivelRisco: 'BAIXO', categoriaId: 'cat-1',
}
const items = [
  { id: 'i2', descricao: 'Temperatura', tipo: 'NUMERICO', unidade: '°C', obrigatorio: false, ordem: 2 },
  { id: 'i1', descricao: 'Alarme sonoro', tipo: 'BOOLEANO', unidade: null, obrigatorio: true, ordem: 1 },
]
const done = { id: 'ot-1', codigo: 'OT-9', tipo: 'PREVENTIVA', status: 'CONCLUIDA', equipamentoId: 'equipment-1', checklistId: 'chk-1', local: null, dataAgendada: null, iniciadaEm: null, concluidaEm: '2026-10-01T12:00:00Z' }

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/assets/equipment-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets/:id" element={children} /></Routes></MemoryRouter></QueryClientProvider>
}

function setup(opts: { equipment?: object; categories?: object[]; itemsFail?: boolean; orders?: object[]; roles?: Array<'admin_cliente' | 'tecnico'> } = {}) {
  setAuthSession('token', { id: 'u1', name: 'Clara', roles: opts.roles ?? ['admin_cliente'], tenantId: 't1' })
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/equipamentos/equipment-1') return { data: { ...base, ...opts.equipment } } as never
    if (url === '/setores/sector-1') return { data: { id: 'sector-1', hospitalId: 'h1', nome: 'UTI' } } as never
    if (url === '/hospitais/h1') return { data: { id: 'h1', nome: 'Hospital' } } as never
    if (url === '/ordens-de-trabalho') return { data: opts.orders ?? [] } as never
    if (url === '/categorias-equipamento') return { data: opts.categories ?? [{ id: 'cat-1', nome: 'Bombas', ativa: true, checklistPadraoId: 'chk-1', origem: 'manual', revisada: true }] } as never
    if (url === '/checklists') return { data: [{ id: 'chk-1', nome: 'Inspeção funcional' }] } as never
    if (url === '/checklists/chk-1/itens') { if (opts.itemsFail) throw new Error('boom'); return { data: items } as never }
    return { data: [] } as never
  })
  render(<EquipmentDetailPage />, { wrapper: Providers })
  return userEvent.setup()
}

async function openTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('tab', { name: 'Checklists' }))
}

describe('EquipmentChecklistSection', () => {
  beforeEach(() => { vi.clearAllMocks(); clearAuthSession() })

  it('shows the category default checklist with item types and link', async () => {
    const user = setup()
    await openTab(user)
    expect(await screen.findByText(/Inspeção funcional/)).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('1. Alarme sonoro')
    expect(rows[0]).toHaveTextContent('Sim ou Não')
    expect(rows[0]).toHaveTextContent('Obrigatório')
    expect(rows[1]).toHaveTextContent('Temperatura')
    expect(rows[1]).toHaveTextContent('°C')
    expect(screen.getByRole('link', { name: 'Abrir checklists' })).toHaveAttribute('href', '/checklists')
  })

  it('warns when the equipment has no category', async () => {
    const user = setup({ equipment: { categoriaId: null } })
    await openTab(user)
    expect(await screen.findByText(/não tem categoria/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Definir categoria' })).toHaveAttribute('href', '/assets/equipment-1/edit')
  })

  it('shows empty state with link when the category has no default checklist', async () => {
    const user = setup({ categories: [{ id: 'cat-1', nome: 'Bombas', ativa: true, checklistPadraoId: null, origem: 'manual', revisada: true }] })
    await openTab(user)
    expect(await screen.findByText(/Nenhum checklist padrão/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para Categorias' })).toHaveAttribute('href', '/settings/categories')
  })

  it('lists completed work orders with checklist, linking the code for admins', async () => {
    const user = setup({ orders: [done, { ...done, id: 'ot-2', codigo: 'OT-10', status: 'AGENDADA' }] })
    await openTab(user)
    expect(await screen.findByRole('link', { name: 'OT-9' })).toHaveAttribute('href', '/work-orders/ot-1')
    expect(screen.queryByText('OT-10')).not.toBeInTheDocument()
    expect(screen.getByText(/ainda não é retornado pela API/)).toBeInTheDocument()
  })

  it('shows absence of previous executions', async () => {
    const user = setup()
    await openTab(user)
    expect(await screen.findByText(/Nenhuma OT concluída com checklist/)).toBeInTheDocument()
  })

  it('isolates a checklist items failure from the rest of the page', async () => {
    const user = setup({ itemsFail: true })
    await openTab(user)
    expect(await screen.findByText(/Não foi possível carregar os itens do checklist/)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Bomba de infusão' }).length).toBeGreaterThan(0)
    expect(screen.getByText(/Nenhuma OT concluída com checklist/)).toBeInTheDocument()
  })

  it('does not link to admin-only routes for a technician', async () => {
    const user = setup({ roles: ['tecnico'], orders: [done] })
    await openTab(user)
    expect(await screen.findByText('OT-9')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'OT-9' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir checklists' })).not.toBeInTheDocument()
  })
})
