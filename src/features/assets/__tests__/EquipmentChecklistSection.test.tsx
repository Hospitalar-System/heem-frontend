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
const longParecer = 'Parecer muito longo. '.repeat(15).trim()
const run = {
  otId: 'ot-1', otCodigo: 'OT-9', concluidaEm: '2026-10-01T12:00:00Z', tecnicoNome: 'Bruno Técnico', parecerTecnico: longParecer,
  itens: [
    { itemId: 'i1', descricao: 'Alarme sonoro', tipo: 'BOOLEANO', valor: true, unidade: null, conforme: true, faixaMin: null, faixaMax: null, valorReferencia: null },
    { itemId: 'i2', descricao: 'Temperatura', tipo: 'NUMERICO', valor: 41.5, unidade: '°C', conforme: false, faixaMin: 35, faixaMax: 40, valorReferencia: null },
    { itemId: 'i3', descricao: 'Observação visual', tipo: 'TEXTO', valor: null, unidade: null, conforme: null, faixaMin: null, faixaMax: null, valorReferencia: 'Sem avarias' },
  ],
}

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/assets/equipment-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets/:id" element={children} /></Routes></MemoryRouter></QueryClientProvider>
}

function setup(opts: { equipment?: object; categories?: object[]; itemsFail?: boolean; executions?: object[]; total?: number; executionsFail?: boolean; roles?: Array<'admin_cliente' | 'tecnico'> } = {}) {
  setAuthSession('token', { id: 'u1', name: 'Clara', roles: opts.roles ?? ['admin_cliente'], tenantId: 't1' })
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/equipamentos/equipment-1') return { data: { ...base, ...opts.equipment } } as never
    if (url === '/setores/sector-1') return { data: { id: 'sector-1', hospitalId: 'h1', nome: 'UTI' } } as never
    if (url === '/hospitais/h1') return { data: { id: 'h1', nome: 'Hospital' } } as never
    if (url === '/equipamentos/equipment-1/execucoes-checklist') { if (opts.executionsFail) throw new Error('boom'); const data = opts.executions ?? []; return { data, headers: { 'x-total-count': String(opts.total ?? data.length) } } as never }
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

  it('lists executions with the conformity summary, linking the code for admins', async () => {
    const user = setup({ executions: [run, { ...run, otId: 'ot-2', otCodigo: 'OT-10', parecerTecnico: null }] })
    await openTab(user)
    expect(await screen.findByRole('link', { name: 'OT-9' })).toHaveAttribute('href', '/work-orders/ot-1')
    expect(screen.getAllByText('1 conforme / 1 não conforme / 1 sem medição')).toHaveLength(2)
    expect(screen.getAllByText(/Bruno Técnico/)[0]).toHaveTextContent('Concluída em')
    expect(screen.queryByText('Alarme sonoro', { selector: 'th' })).not.toBeInTheDocument()
    expect(screen.queryByText(/ainda não é retornado/)).not.toBeInTheDocument()
  })

  it('expands the items with formatted values, expected range and conformity badges', async () => {
    const user = setup({ executions: [run] })
    await openTab(user)
    const toggle = await screen.findByRole('button', { name: /Ver itens/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Alarme sonoro')
    expect(rows[1]).toHaveTextContent('Sim')
    expect(rows[1]).toHaveTextContent('Conforme')
    expect(rows[2]).toHaveTextContent('41,5 °C')
    expect(rows[2]).toHaveTextContent('35–40 °C')
    expect(rows[2]).toHaveTextContent('Não conforme')
    expect(rows[3]).toHaveTextContent('Ref.: Sem avarias')
    expect(rows[3]).toHaveTextContent('Sem medição')
  })

  it('truncates a long technical opinion and expands it on demand', async () => {
    const user = setup({ executions: [run] })
    await openTab(user)
    const more = await screen.findByRole('button', { name: 'Mostrar mais' })
    expect(screen.queryByText(longParecer)).not.toBeInTheDocument()
    await user.click(more)
    expect(screen.getByText(longParecer)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows absence of previous executions', async () => {
    const user = setup()
    await openTab(user)
    expect(await screen.findByText('Nenhuma execução registrada.')).toBeInTheDocument()
  })

  it('isolates an executions failure and retries', async () => {
    const user = setup({ executionsFail: true })
    await openTab(user)
    expect(await screen.findByText(/Não foi possível carregar as execuções do checklist/)).toBeInTheDocument()
    expect(screen.getByText(/Inspeção funcional/)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Bomba de infusão' }).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/equipamentos/equipment-1/execucoes-checklist').length).toBeGreaterThan(1)
  })

  it('paginates on the server sending pagina and tamanho', async () => {
    const user = setup({ executions: [run], total: 30 })
    await openTab(user)
    await screen.findByText('OT-9')
    const calls = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/equipamentos/equipment-1/execucoes-checklist')
    expect(calls()[0][1]).toEqual({ params: { pagina: 0, tamanho: 10 } })
    await user.click(screen.getByRole('button', { name: 'Ir para a página 2' }))
    await vi.waitFor(() => expect(calls().at(-1)?.[1]).toEqual({ params: { pagina: 1, tamanho: 10 } }))
  })

  it('isolates a checklist items failure from the rest of the page', async () => {
    const user = setup({ itemsFail: true })
    await openTab(user)
    expect(await screen.findByText(/Não foi possível carregar os itens do checklist/)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Bomba de infusão' }).length).toBeGreaterThan(0)
    expect(screen.getByText('Nenhuma execução registrada.')).toBeInTheDocument()
  })

  it('does not link to admin-only routes for a technician', async () => {
    const user = setup({ roles: ['tecnico'], executions: [run] })
    await openTab(user)
    expect(await screen.findByText('OT-9')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'OT-9' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir checklists' })).not.toBeInTheDocument()
  })
})
