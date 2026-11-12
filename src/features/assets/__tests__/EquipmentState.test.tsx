import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { EquipmentStateBadge } from '../components/EquipmentStateBadge'
import { EquipmentListTable } from '../components/EquipmentListTable'
import { EquipmentDetailPage } from '../pages/EquipmentDetailPage'
import type { Equipment } from '../types'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('../components/EquipmentPhotoSection', async () => ({ ...(await vi.importActual<object>('../components/EquipmentPhotoSection')), EquipmentThumb: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

type Role = 'admin_cliente' | 'tecnico' | 'interno_hospital'
const base = {
  id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-001', nome: 'Bomba de infusão', modelo: null, numeroSerie: null,
  marca: null, fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'II', statusCicloVida: 'ATIVO', criticidade: 'MEDIA',
  tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: null,
  dataGarantiaFim: null, nivelRisco: 'BAIXO', categoriaId: null, categoriaNome: null,
}
const history = [
  { id: 'h1', estadoAnterior: 'ATIVO', estadoNovo: 'EM_MANUTENCAO', descricao: 'Troca de válvula', alteradoPorId: 'u2', alteradoPorNome: 'Bruno', alteradoEm: '2026-11-08T14:20:00Z', origem: 'MANUAL', ordemTrabalhoId: null },
  { id: 'h2', estadoAnterior: 'EM_MANUTENCAO', estadoNovo: 'ATIVO', descricao: null, alteradoPorId: 'u2', alteradoPorNome: 'Carla', alteradoEm: '2026-11-09T10:00:00Z', origem: 'ORDEM_TRABALHO', ordemTrabalhoId: 'ot-77' },
]

function Where() { const l = useLocation(); return <output data-testid="where">{l.pathname}{l.search}</output> }
function Providers({ children, url }: PropsWithChildren<{ url: string }>) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets/:id" element={<>{children}<Where /></>} /></Routes></MemoryRouter></QueryClientProvider>
}

function setup(opts: { role?: Role; equipment?: object; history?: object[]; total?: number; historyFail?: boolean; query?: string } = {}) {
  setAuthSession('token', { id: 'u1', name: 'Clara', roles: [opts.role ?? 'admin_cliente'], tenantId: 't1' })
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/equipamentos/equipment-1') return { data: { ...base, ...opts.equipment } } as never
    if (url === '/setores/sector-1') return { data: { id: 'sector-1', hospitalId: 'h1', nome: 'UTI' } } as never
    if (url === '/hospitais/h1') return { data: { id: 'h1', nome: 'Hospital' } } as never
    if (url === '/equipamentos/equipment-1/historico-estado') {
      if (opts.historyFail) throw new Error('boom')
      const data = opts.history ?? history
      return { data, headers: { 'x-total-count': String(opts.total ?? data.length) } } as never
    }
    return { data: [] } as never
  })
  vi.mocked(apiClient.patch).mockResolvedValue({ data: base } as never)
  render(<EquipmentDetailPage />, { wrapper: ({ children }) => <Providers url={`/assets/equipment-1${opts.query ?? ''}`}>{children}</Providers> })
  return userEvent.setup()
}
const problem = (code: string, status: number) => Object.assign(new Error(code), { response: { status, data: { code } } })
const openModal = async (user: ReturnType<typeof userEvent.setup>) => { await user.click(await screen.findByRole('button', { name: 'Alterar estado' })); return screen.findByRole('dialog') }
const historyCalls = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/equipamentos/equipment-1/historico-estado')

describe('EquipmentStateBadge', () => {
  it.each([
    ['ATIVO', 'Apto', 'solid'], ['NAO_APTO', 'Não apto', 'double'], ['EM_MANUTENCAO', 'Em manutenção', 'dashed'], ['DESATIVADO', 'Desativado', 'dotted'],
    ['INATIVO', 'Inativo', 'solid'], ['DESCARTADO', 'Descartado', 'solid'],
  ])('%s mostra o texto "%s" com borda %s', (state, label, border) => {
    render(<EquipmentStateBadge state={state} />)
    const badge = screen.getByText(label)
    expect(badge).toHaveAttribute('data-border', border)
    expect(badge.className).toContain(border === 'solid' ? 'border-solid' : `border-${border}`)
    expect(badge.className).not.toMatch(/border-white|\/\d/)
  })

  it('usa a cor semântica de cada estado e tolera enum desconhecido mostrando o valor cru', () => {
    const { rerender } = render(<EquipmentStateBadge state="NAO_APTO" />)
    expect(screen.getByText('Não apto').className).toContain('badge-danger')
    rerender(<EquipmentStateBadge state="ATIVO" />)
    expect(screen.getByText('Apto').className).toContain('badge-success')
    rerender(<EquipmentStateBadge state="EM_MANUTENCAO" />)
    expect(screen.getByText('Em manutenção').className).toContain('badge-warning')
    rerender(<EquipmentStateBadge state="DESATIVADO" />)
    expect(screen.getByText('Desativado').className).toContain('badge-neutral')
    rerender(<EquipmentStateBadge state="QUARENTENA" />)
    expect(screen.getByText('QUARENTENA').className).toContain('badge-neutral')
  })
})

describe('lista de equipamentos', () => {
  it('troca o selo pelo estado novo (Não apto e Apto)', () => {
    const items = [{ ...base, id: 'a', codigo: 'EQ-1', statusCicloVida: 'NAO_APTO' }, { ...base, id: 'b', codigo: 'EQ-2', statusCicloVida: 'ATIVO' }] as unknown as Equipment[]
    render(<MemoryRouter><EquipmentListTable items={items} sectorNameById={new Map()} /></MemoryRouter>)
    expect(screen.getByText('Não apto')).toHaveAttribute('data-border', 'double')
    expect(screen.getByText('Apto')).toHaveAttribute('data-border', 'solid')
    expect(screen.queryByText('Ativo')).not.toBeInTheDocument()
  })
})

describe('ficha: estado atual', () => {
  beforeEach(() => { vi.clearAllMocks(); clearAuthSession() })

  it('mostra selo, descrição e data de atualização', async () => {
    setup({ equipment: { statusCicloVida: 'EM_MANUTENCAO', descricaoEstado: 'Aguardando peça', estadoAtualizadoEm: '2026-11-08T14:20:00Z' } })
    expect(await screen.findByText('Em manutenção')).toHaveAttribute('data-border', 'dashed')
    expect(screen.getByTestId('descricao-estado')).toHaveTextContent('Aguardando peça')
    expect(screen.getByText(/atualizado em \d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument()
  })

  it('interno só lê: sem botão Alterar estado', async () => {
    setup({ role: 'interno_hospital' })
    await screen.findByText('Apto')
    expect(screen.queryByRole('button', { name: 'Alterar estado' })).not.toBeInTheDocument()
  })

  it('DESCARTADO não oferece mudança nem para admin', async () => {
    setup({ equipment: { statusCicloVida: 'DESCARTADO' } })
    await screen.findByText('Descartado')
    expect(screen.queryByRole('button', { name: 'Alterar estado' })).not.toBeInTheDocument()
  })

  it('tolera estado desconhecido no cabeçalho', async () => {
    setup({ equipment: { statusCicloVida: 'QUARENTENA' } })
    expect(await screen.findByText('QUARENTENA')).toBeInTheDocument()
  })
})

describe('ficha: Alterar estado', () => {
  beforeEach(() => { vi.clearAllMocks(); clearAuthSession() })

  it('técnico vê só os 4 estados rápidos; admin vê também Inativo e Descartado', async () => {
    const user = setup({ role: 'tecnico' })
    const dialog = await openModal(user)
    expect(within(dialog).getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual(['Apto', 'Não apto', 'Em manutenção', 'Desativado'])
    expect(within(dialog).queryByRole('radio', { name: 'Inativo' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('radio', { name: 'Descartado' })).not.toBeInTheDocument()
  })

  it('admin vê Inativo e Descartado em "Outros"', async () => {
    const user = setup({ role: 'admin_cliente' })
    const dialog = await openModal(user)
    expect(within(dialog).getAllByRole('radio')).toHaveLength(6)
    expect(within(within(dialog).getByRole('radiogroup', { name: 'Outros estados' })).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Inativo', 'Descartado'])
  })

  it('Em manutenção exige descrição: bloqueia o envio e mostra o erro', async () => {
    const user = setup({ role: 'tecnico' })
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Em manutenção' }))
    expect(within(dialog).getByLabelText(/Descrição \(obrigatória\)/)).toHaveAttribute('aria-required', 'true')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('obrigatória')
    expect(apiClient.patch).not.toHaveBeenCalled()
  })

  it('envia estado e descrição (aparada) com contador até 200', async () => {
    const user = setup({ role: 'tecnico' })
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Não apto' }))
    await user.type(within(dialog).getByLabelText(/Descrição/), '  Sem alarme  ')
    expect(within(dialog).getByText('14/200')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'NAO_APTO', descricao: 'Sem alarme' }))
  })

  it('voltar a Apto oculta a descrição e a omite do corpo', async () => {
    const user = setup({ role: 'tecnico', equipment: { statusCicloVida: 'EM_MANUTENCAO', descricaoEstado: 'Aguardando peça' } })
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Apto' }))
    expect(within(dialog).queryByLabelText(/Descrição/)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'ATIVO' }))
  })

  it('Descartado pede confirmação antes de enviar', async () => {
    const user = setup({ role: 'admin_cliente' })
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Descartado' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Confirme o descarte')
    expect(apiClient.patch).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('checkbox'))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'DESCARTADO' }))
  })

  it('mostra "Salvando…" enquanto envia e fecha o modal ao concluir', async () => {
    let finish: (value: unknown) => void = () => undefined
    const user = setup({ role: 'tecnico' })
    vi.mocked(apiClient.patch).mockReturnValue(new Promise((resolve) => { finish = resolve }) as never)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Desativado' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    expect(await within(dialog).findByRole('button', { name: 'Salvando…' })).toBeDisabled()
    finish({ data: base })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it.each([
    [problem('DESCRICAO_OBRIGATORIA', 400), 'obrigatória'],
    [problem('ACESSO_NEGADO', 403), 'perfil não pode'],
    [problem('TRANSICAO_INVALIDA', 409), 'descartado'],
    [new Error('Network Error'), 'Sem conexão'],
  ])('mapeia o erro do servidor para mensagem em pt-BR (%#)', async (failure, text) => {
    const user = setup({ role: 'tecnico' })
    vi.mocked(apiClient.patch).mockRejectedValue(failure)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Desativado' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(text)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('ficha: Histórico de estado', () => {
  beforeEach(() => { vi.clearAllMocks(); clearAuthSession() })
  const openTab = async (user: ReturnType<typeof userEvent.setup>) => { await user.click(await screen.findByRole('tab', { name: 'Histórico de estado' })); return screen.findByRole('table', { name: 'Histórico de estado' }) }

  it('lista linhas com selos De/Para, descrição, autor e origem; link da OT só para admin', async () => {
    const user = setup({ role: 'admin_cliente' })
    const rows = within(await openTab(user)).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Troca de válvula')
    expect(rows[0]).toHaveTextContent('Bruno')
    expect(rows[0]).toHaveTextContent('Manual')
    expect(rows[0]).toHaveTextContent('Apto')
    expect(rows[0]).toHaveTextContent('Em manutenção')
    expect(rows[1]).toHaveTextContent('Ordem de trabalho')
    expect(within(rows[1]).getByRole('link', { name: 'Abrir OT' })).toHaveAttribute('href', '/work-orders/ot-77')
    expect(historyCalls().at(-1)?.[1]).toEqual({ params: { pagina: 0, tamanho: 10 } })
  })

  it('técnico vê a origem sem link para a OT', async () => {
    const user = setup({ role: 'tecnico' })
    const rows = within(await openTab(user)).getAllByRole('row').slice(1)
    expect(rows[1]).toHaveTextContent('Ordem de trabalho')
    expect(within(rows[1]).queryByRole('link')).not.toBeInTheDocument()
  })

  it('interno também vê o histórico', async () => {
    const user = setup({ role: 'interno_hospital' })
    expect(within(await openTab(user)).getAllByRole('row')).toHaveLength(3)
  })

  it('paginação envia pagina/tamanho (0-based) e usa epagina/etamanho na URL', async () => {
    const user = setup({ role: 'admin_cliente', total: 35, query: '?epagina=2' })
    await openTab(user)
    await waitFor(() => expect(historyCalls().at(-1)?.[1]).toEqual({ params: { pagina: 1, tamanho: 10 } }))
    await user.click(await screen.findByRole('button', { name: /Próxima|Página 3/ }))
    await waitFor(() => expect(historyCalls().at(-1)?.[1]).toEqual({ params: { pagina: 2, tamanho: 10 } }))
    expect(screen.getByTestId('where')).toHaveTextContent('epagina=3')
  })

  it('mostra estado vazio', async () => {
    const user = setup({ history: [] })
    await user.click(await screen.findByRole('tab', { name: 'Histórico de estado' }))
    expect(await screen.findByText('Nenhuma mudança de estado')).toBeInTheDocument()
  })

  it('mostra erro com nova tentativa', async () => {
    const user = setup({ historyFail: true })
    await user.click(await screen.findByRole('tab', { name: 'Histórico de estado' }))
    expect(await screen.findByText('Não foi possível carregar o histórico de estado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument()
  })

  it('tolera estados desconhecidos no histórico', async () => {
    const user = setup({ history: [{ ...history[0], estadoAnterior: null, estadoNovo: 'QUARENTENA', origem: 'IMPORTACAO' }] })
    const rows = within(await openTab(user)).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('QUARENTENA')
    expect(rows[0]).toHaveTextContent('IMPORTACAO')
  })
})
