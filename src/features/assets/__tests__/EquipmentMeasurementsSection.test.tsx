import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
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
  dataGarantiaFim: null, nivelRisco: 'BAIXO', categoriaId: null,
}
const temp = (valor: number | null, conforme: boolean | null) => ({ itemId: 'i2', descricao: 'Temperatura', tipo: 'NUMERICO', valor, unidade: '°C', conforme, faixaMin: 35, faixaMax: 40, valorReferencia: null })
const alarm = { itemId: 'i1', descricao: 'Alarme sonoro', tipo: 'BOOLEANO', valor: true, unidade: null, conforme: true, faixaMin: null, faixaMax: null, valorReferencia: null }
const executions = [
  { otId: 'ot-2', otCodigo: 'OT-20', concluidaEm: '2026-10-10T12:00:00Z', tecnicoNome: 'Bruno', parecerTecnico: null, itens: [alarm, temp(41.5, false), { itemId: 'i3', descricao: 'Observação', tipo: 'TEXTO', valor: null, unidade: null, conforme: null, faixaMin: null, faixaMax: null, valorReferencia: null }] },
  { otId: 'ot-1', otCodigo: 'OT-10', concluidaEm: '2026-08-05T12:00:00Z', tecnicoNome: 'Bruno', parecerTecnico: null, itens: [temp(37, null)] },
]

function Providers({ children, url }: PropsWithChildren<{ url: string }>) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets/:id" element={children} /></Routes></MemoryRouter></QueryClientProvider>
}

function setup(opts: { data?: object[]; total?: number; fail?: boolean; roles?: Array<'admin_cliente' | 'tecnico'>; query?: string } = {}) {
  setAuthSession('token', { id: 'u1', name: 'Clara', roles: opts.roles ?? ['admin_cliente'], tenantId: 't1' })
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/equipamentos/equipment-1') return { data: base } as never
    if (url === '/setores/sector-1') return { data: { id: 'sector-1', hospitalId: 'h1', nome: 'UTI' } } as never
    if (url === '/hospitais/h1') return { data: { id: 'h1', nome: 'Hospital' } } as never
    if (url === '/equipamentos/equipment-1/execucoes-checklist') {
      if (opts.fail) throw new Error('boom')
      const data = opts.data ?? executions
      return { data, headers: { 'x-total-count': String(opts.total ?? data.length) } } as never
    }
    return { data: [] } as never
  })
  render(<EquipmentDetailPage />, { wrapper: ({ children }) => <Providers url={`/assets/equipment-1${opts.query ?? ''}`}>{children}</Providers> })
  return userEvent.setup()
}

async function openTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('tab', { name: 'Histórico de medições' }))
}

const table = () => screen.findByRole('table', { name: 'Histórico de medições do equipamento' })
const calls = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/equipamentos/equipment-1/execucoes-checklist')

describe('EquipmentMeasurementsSection', () => {
  beforeEach(() => { vi.clearAllMocks(); clearAuthSession() })

  it('flattens executions into one row per measurement with result badges', async () => {
    const user = setup()
    await openTab(user)
    const rows = within(await table()).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Alarme sonoro')
    expect(rows[0]).toHaveTextContent('Sim')
    expect(rows[0]).toHaveTextContent('Conforme')
    expect(rows[1]).toHaveTextContent('41,5')
    expect(rows[1]).toHaveTextContent('35–40 °C')
    expect(rows[1]).toHaveTextContent('Não conforme')
    expect(rows[2]).toHaveTextContent('Sem avaliação')
    expect(screen.queryByText('Observação')).not.toBeInTheDocument()
    expect(screen.queryByText(/API ainda não fornece/)).not.toBeInTheDocument()
  })

  it('shows items without measurement only when requested', async () => {
    const user = setup()
    await openTab(user)
    await table()
    await user.click(screen.getByRole('checkbox', { name: 'Incluir itens sem medição' }))
    const row = within(await table()).getByRole('row', { name: /Observação/ })
    expect(row).toHaveTextContent('Sem medição')
  })

  it('filters by item and draws the trend chart for a numeric item', async () => {
    const user = setup()
    await openTab(user)
    await table()
    expect(screen.queryByRole('img', { name: /Tendência de Temperatura/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por item' }))
    await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Temperatura' }))
    const rows = within(await table()).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(screen.queryByText('Alarme sonoro', { selector: 'td span' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Tendência de Temperatura: 2 medições, de 37 °C em .* a 41,5 °C em .*; faixa esperada 35–40 °C/ })).toBeInTheDocument()
  })

  it('does not draw the chart for a non numeric item', async () => {
    const user = setup()
    await openTab(user)
    await table()
    await user.click(screen.getByRole('combobox', { name: 'Filtrar por item' }))
    await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Alarme sonoro' }))
    expect(within(await table()).getAllByRole('row')).toHaveLength(2)
    expect(screen.queryByRole('img', { name: /Tendência/ })).not.toBeInTheDocument()
  })

  it('filters by period on the loaded executions and offers to clear', async () => {
    const user = setup({ query: '?mde=2026-09-01&mate=2026-10-31' })
    await openTab(user)
    const rows = within(await table()).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(screen.queryByText('OT-10')).not.toBeInTheDocument()
    expect(screen.getByText(/filtros valem para as execuções carregadas nesta página/i)).toBeInTheDocument()
  })

  it('shows the empty state with a clear action when filters hide everything', async () => {
    const user = setup({ query: '?mde=2027-01-01' })
    await openTab(user)
    expect(await screen.findByText('Nenhuma medição com esses filtros')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect((await screen.findAllByText('OT-20')).length).toBeGreaterThan(0)
  })

  it('paginates on the server with its own params', async () => {
    const user = setup({ total: 30 })
    await openTab(user)
    await table()
    expect(calls()[0][1]).toEqual({ params: { pagina: 0, tamanho: 10 } })
    await user.click(screen.getByRole('button', { name: 'Ir para a página 2' }))
    await vi.waitFor(() => expect(calls().at(-1)?.[1]).toEqual({ params: { pagina: 1, tamanho: 10 } }))
  })

  it('reads mpagina and mtamanho from the URL', async () => {
    const user = setup({ total: 120, query: '?mpagina=3&mtamanho=25' })
    await openTab(user)
    await table()
    expect(calls()[0][1]).toEqual({ params: { pagina: 2, tamanho: 25 } })
  })

  it('links the OT only for admin', async () => {
    const admin = setup()
    await openTab(admin)
    expect((await screen.findAllByRole('link', { name: 'OT-20' }))[0]).toHaveAttribute('href', '/work-orders/ot-2')
  })

  it('does not link the OT for a technician', async () => {
    const user = setup({ roles: ['tecnico'] })
    await openTab(user)
    expect((await screen.findAllByText('OT-20')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'OT-20' })).not.toBeInTheDocument()
  })

  it('shows the empty state without executions', async () => {
    const user = setup({ data: [] })
    await openTab(user)
    expect(await screen.findByText('Nenhuma medição registrada')).toBeInTheDocument()
  })

  it('shows an error with retry', async () => {
    const user = setup({ fail: true })
    await openTab(user)
    expect(await screen.findByText('Não foi possível carregar o histórico de medições.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
