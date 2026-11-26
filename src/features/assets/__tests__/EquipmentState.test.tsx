import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseDate } from '@/test/date-helpers'
import { chooseOption } from '@/test/select-helpers'
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

const orders = [
  { id: 'ot-1', codigo: 'OT-CORR-7', tipo: 'CORRETIVA', status: 'EM_EXECUCAO', equipamentoId: 'equipment-1' },
  { id: 'ot-2', codigo: 'OT-PREV-3', tipo: 'PREVENTIVA', status: 'CANCELADA', equipamentoId: 'equipment-1' },
]
const tenantUsers = [
  { id: 'u1', codigo: 'U1', nome: 'Clara', email: 'c@x', role: 'admin_cliente', ativo: true },
  { id: 'u5', codigo: 'U5', nome: 'Diego Técnico', email: 'd@x', role: 'tecnico', ativo: true },
  { id: 'u6', codigo: 'U6', nome: 'Ex Usuário', email: 'e@x', role: 'tecnico', ativo: false },
]

function setup(opts: { role?: Role; equipment?: object; history?: object[]; total?: number; historyFail?: boolean; query?: string } = {}) {
  setAuthSession('token', { id: 'u1', name: 'Clara', roles: [opts.role ?? 'admin_cliente'], tenantId: 't1' })
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/ordens-de-trabalho') return { data: orders } as never
    if (url === '/users') return { data: tenantUsers } as never
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
    ['ATIVO', 'Apto', 'success'], ['NAO_APTO', 'Não apto', 'danger'], ['EM_MANUTENCAO', 'Em manutenção', 'warning'], ['DESATIVADO', 'Desativado', 'neutral'],
    ['INATIVO', 'Inativo', 'muted'], ['DESCARTADO', 'Descartado', 'muted'],
  ])('%s mostra o texto "%s" no tom %s, com ícone e sem borda especial', (state, label, tone) => {
    render(<EquipmentStateBadge state={state} />)
    const badge = screen.getByText(label)
    expect(badge).toHaveAttribute('data-tone', tone)
    expect(badge.className).toContain(`badge-${tone}`)
    expect(badge.className).not.toMatch(/border-(double|dashed|dotted|\[3px\])/)
    expect(badge.querySelector('svg')).not.toBeNull() // eslint-disable-line testing-library/no-node-access
  })

  it('estado desconhecido mostra o texto cru em tom neutro, sem ícone', () => {
    render(<EquipmentStateBadge state="NOVO_ESTADO" />)
    const badge = screen.getByText('NOVO_ESTADO')
    expect(badge).toHaveAttribute('data-tone', 'neutral')
    expect(badge.querySelector('svg')).toBeNull() // eslint-disable-line testing-library/no-node-access
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
    expect(screen.getByText('Não apto')).toHaveAttribute('data-tone', 'danger')
    expect(screen.getByText('Apto')).toHaveAttribute('data-tone', 'success')
    expect(screen.queryByText('Ativo')).not.toBeInTheDocument()
  })
})

describe('ficha: estado atual', () => {
  beforeEach(() => { vi.clearAllMocks(); clearAuthSession() })

  it('mostra selo, descrição e data de atualização', async () => {
    setup({ equipment: { statusCicloVida: 'EM_MANUTENCAO', descricaoEstado: 'Aguardando peça', estadoAtualizadoEm: '2026-11-08T14:20:00Z' } })
    expect(await screen.findByText('Em manutenção')).toHaveAttribute('data-tone', 'warning')
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

  it.each([['INATIVO', 'Inativo'], ['DESCARTADO', 'Descartado']])('técnico não altera %s', async (state, label) => {
    setup({ role: 'tecnico', equipment: { statusCicloVida: state } })
    await screen.findByText(label)
    expect(screen.queryByRole('button', { name: 'Alterar estado' })).not.toBeInTheDocument()
  })

  it('admin altera INATIVO', async () => {
    setup({ equipment: { statusCicloVida: 'INATIVO' } })
    await screen.findByText('Inativo')
    expect(screen.getByRole('button', { name: 'Alterar estado' })).toBeInTheDocument()
  })

  it.each([
    ['estado nulo', { statusCicloVida: null }],
    ['descrição e data do estado ausentes', { statusCicloVida: 'NAO_APTO', descricaoEstado: null, estadoAtualizadoEm: null }],
    ['sem categoria nem foto', { categoriaId: null, categoriaNome: null, fotoVersao: null, fotoUrl: null }],
    ['Em manutenção sem descrição', { statusCicloVida: 'EM_MANUTENCAO', descricaoEstado: undefined }],
  ])('a ficha abre sem erro: %s', async (_nome, equipment) => {
    setup({ equipment })
    expect(await screen.findByRole('heading', { level: 2, name: base.nome })).toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar este equipamento/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar dossiê do equipamento' })).toBeInTheDocument()
  })

  it('cartão Indicadores mostra só o texto compreensível, sem cartões vazios com traço', async () => {
    setup()
    expect(await screen.findByText(/Os indicadores deste equipamento ainda não estão disponíveis/)).toBeInTheDocument()
    expect(screen.queryByText('Disponibilidade')).not.toBeInTheDocument()
    expect(screen.queryByText('OTs no ano')).not.toBeInTheDocument()
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

  it('já em Em manutenção, a descrição continua obrigatória: bloqueia o envio e mostra o erro', async () => {
    const user = setup({ role: 'tecnico', equipment: { statusCicloVida: 'EM_MANUTENCAO', descricaoEstado: null } })
    const dialog = await openModal(user)
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
    expect(within(dialog).getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
    await user.click(within(dialog).getByRole('checkbox'))
    expect(within(dialog).getByRole('checkbox')).not.toHaveAttribute('aria-invalid')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'DESCARTADO' }))
  })

  it('baixa: Descartado, Desativado e Inativo mostram Motivo, Destino e Data da baixa; Apto e Em manutenção não', async () => {
    const user = setup({ role: 'admin_cliente' })
    const dialog = await openModal(user)
    for (const name of ['Apto', 'Em manutenção']) {
      await user.click(within(dialog).getByRole('radio', { name }))
      expect(within(dialog).queryByRole('combobox', { name: 'Motivo da baixa' })).not.toBeInTheDocument()
    }
    for (const name of ['Desativado', 'Inativo', 'Descartado']) {
      await user.click(within(dialog).getByRole('radio', { name }))
      expect(within(dialog).getByRole('combobox', { name: 'Motivo da baixa' })).toBeInTheDocument()
      expect(within(dialog).getByRole('combobox', { name: 'Destino do equipamento' })).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Data da baixa' })).toBeInTheDocument()
    }
    expect(within(dialog).getByText(/Documento de baixa/)).toBeInTheDocument()
  })

  it('baixa: envia motivo, destino e data junto com o descarte (mesma chamada); sem preencher, não envia os campos', async () => {
    const user = setup({ role: 'admin_cliente' })
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Descartado' }))
    await chooseOption(user, 'Motivo da baixa', 'Defeito irreparável')
    await chooseOption(user, 'Destino do equipamento', 'Sucata')
    const now = new Date()
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    await chooseDate(user, 'Data da baixa', day)
    await user.click(within(dialog).getByRole('checkbox', { name: /Entendo que Descartado é definitivo/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'DESCARTADO', motivoBaixa: 'DEFEITO_IRREPARAVEL', destinoBaixa: 'SUCATA', dataBaixa: day }))
  })

  it('baixa: trocar para um estado sem baixa não envia os campos preenchidos antes', async () => {
    const user = setup({ role: 'admin_cliente' })
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Inativo' }))
    await chooseOption(user, 'Motivo da baixa', 'Obsolescência')
    await user.click(within(dialog).getByRole('radio', { name: 'Apto' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'ATIVO' }))
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
    [problem('ORIGEM_OBRIGATORIA', 400), 'origem da manutenção'],
    [problem('OT_DE_OUTRO_EQUIPAMENTO', 400), 'não é deste equipamento'],
    [problem('FORNECEDOR_OBRIGATORIO', 400), 'fornecedor'],
    [problem('JUSTIFICATIVA_OBRIGATORIA', 400), 'justificativa'],
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

describe('ficha: origem do Em manutenção (Story 23.1)', () => {
  beforeEach(() => { vi.clearAllMocks(); clearAuthSession() })
  const toMaintenance = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) => {
    await user.click(within(dialog).getByRole('radio', { name: 'Em manutenção' }))
    // ao entrar em Em manutenção, a Descrição dá lugar à origem (descricao derivada)
    expect(within(dialog).queryByLabelText(/Descrição/)).not.toBeInTheDocument()
  }

  it('OT vinculada: lista só OTs não canceladas do equipamento, exige a escolha e envia ordemTrabalhoId', async () => {
    const user = setup({ role: 'tecnico' })
    const dialog = await openModal(user)
    await toMaintenance(user, dialog)
    expect(within(dialog).getByRole('group', { name: /Origem da manutenção/ })).toBeInTheDocument()
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/ordens-de-trabalho', { params: { equipamentoId: 'equipment-1' } })
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    // erro junto do campo, ligado por aria-describedby, com foco no campo; sem resumo no rodapé (um erro só)
    const select = within(dialog).getByRole('combobox', { name: 'OT vinculada' })
    expect(await within(dialog).findByText('Escolha a OT que originou a manutenção.')).toHaveAttribute('id', select.getAttribute('aria-describedby'))
    expect(select).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(select).toHaveFocus())
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(apiClient.patch).not.toHaveBeenCalled()
    await user.click(select)
    expect(screen.queryByRole('option', { name: /OT-PREV-3/ })).not.toBeInTheDocument()
    const option = screen.getByRole('option', { name: /^OT-CORR-7 · Corretiva/ })
    expect(option).toHaveTextContent('Em execução') // status no selo
    await user.click(option)
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'EM_MANUTENCAO', descricao: 'OT OT-CORR-7', ordemTrabalhoId: 'ot-1' }))
  })

  it('justificativa externa exige fornecedor e texto; técnico não escolhe quem retirou', async () => {
    const user = setup({ role: 'tecnico' })
    const dialog = await openModal(user)
    await toMaintenance(user, dialog)
    await user.click(within(dialog).getByRole('radio', { name: 'Justificativa' }))
    expect(within(dialog).getByText('Retirado por: você (quem está registrando).')).toBeInTheDocument()
    expect(within(dialog).queryByRole('combobox', { name: 'Retirado por' })).not.toBeInTheDocument()
    await chooseOption(user, 'Destino da manutenção', 'Manutenção externa')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    // dois erros: cada um abaixo do seu campo, resumo curto no rodapé e foco no primeiro (Fornecedor)
    expect(await within(dialog).findByText('Informe o fornecedor: ele é obrigatório na manutenção externa.')).toBeInTheDocument()
    expect(within(dialog).getByText('Informe a justificativa da manutenção.')).toBeInTheDocument()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Corrija os campos destacados')
    await waitFor(() => expect(within(dialog).getByLabelText(/Fornecedor \(obrigatório\)/)).toHaveFocus())
    await user.type(within(dialog).getByLabelText(/Fornecedor \(obrigatório\)/), ' Assistec ')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    expect(await within(dialog).findByText('Informe a justificativa da manutenção.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Justificativa \(obrigatória\)/)).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Justificativa \(obrigatória\)/), 'Placa queimada')
    expect(within(dialog).getByText('14/300')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'EM_MANUTENCAO', descricao: 'Placa queimada', destino: 'manutencao_externa', justificativa: 'Placa queimada', fornecedor: 'Assistec' }))
    expect(vi.mocked(apiClient.get).mock.calls.some(([url]) => url === '/users')).toBe(false)
  })

  it('admin escolhe quem retirou entre os usuários ativos', async () => {
    const user = setup({ role: 'admin_cliente' })
    const dialog = await openModal(user)
    await toMaintenance(user, dialog)
    await user.click(within(dialog).getByRole('radio', { name: 'Justificativa' }))
    await user.click(within(dialog).getByRole('combobox', { name: 'Retirado por' }))
    expect(screen.queryByRole('option', { name: 'Ex Usuário' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: 'Diego Técnico' }))
    await user.type(within(dialog).getByLabelText(/Justificativa \(obrigatória\)/), 'Levado à oficina')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'EM_MANUTENCAO', descricao: 'Levado à oficina', destino: 'manutencao_hospital', justificativa: 'Levado à oficina', retiradoPor: 'u5' }))
  })

  it('justificativa longa: a descricao derivada é cortada em 200 caracteres', async () => {
    const user = setup({ role: 'tecnico' })
    const dialog = await openModal(user)
    await toMaintenance(user, dialog)
    await user.click(within(dialog).getByRole('radio', { name: 'Justificativa' }))
    const long = 'a'.repeat(250)
    await user.click(within(dialog).getByLabelText(/Justificativa \(obrigatória\)/))
    await user.paste(long)
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'EM_MANUTENCAO', descricao: 'a'.repeat(200), destino: 'manutencao_hospital', justificativa: 'a'.repeat(250).slice(0, 300) }))
  })

  it('equipamento que já está Em manutenção: editar a descrição não pede origem', async () => {
    const user = setup({ role: 'tecnico', equipment: { statusCicloVida: 'EM_MANUTENCAO', descricaoEstado: 'Aguardando peça' } })
    const dialog = await openModal(user)
    expect(within(dialog).queryByRole('group', { name: /Origem da manutenção/ })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Salvar estado' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/estado', { estado: 'EM_MANUTENCAO', descricao: 'Aguardando peça' }))
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

  it('mostra motivo, destino e data da baixa como linha secundária abaixo da descrição', async () => {
    const entry = { id: 'h9', estadoAnterior: 'ATIVO', estadoNovo: 'DESCARTADO', descricao: 'Sem conserto', alteradoPorId: 'u2', alteradoPorNome: 'Bruno', alteradoEm: '2026-11-10T14:20:00Z', origem: 'MANUAL', ordemTrabalhoId: null, motivoBaixa: 'DEFEITO_IRREPARAVEL', destinoBaixa: 'SUCATA', dataBaixa: '2026-11-09' }
    const user = setup({ role: 'admin_cliente', history: [entry, history[0]] })
    await user.click(await screen.findByRole('tab', { name: 'Histórico de estado' }))
    expect(await screen.findByText('Motivo: Defeito irreparável · Destino: Sucata · Data da baixa: 09/11/2026')).toBeInTheDocument()
    expect(screen.getAllByText(/^Motivo:/)).toHaveLength(1) // entrada antiga sem baixa não mostra a linha
  })

  it('origem do Em manutenção nos termos do dossiê: coluna Origem com o resumo, descrição com a justificativa e "Retirado por" abaixo', async () => {
    const at = (id: string, origemManutencao: object) => ({ id, estadoAnterior: 'ATIVO', estadoNovo: 'EM_MANUTENCAO', descricao: 'Parado', alteradoPorId: 'u2', alteradoPorNome: 'Bruno', alteradoEm: '2026-11-10T14:20:00Z', origem: 'MANUAL', ordemTrabalhoId: null, origemManutencao })
    const user = setup({ role: 'admin_cliente', history: [
      at('o1', { tipo: 'ordem_trabalho', ordemTrabalhoId: 'ot-1' }),
      at('o2', { tipo: 'justificativa', destino: 'manutencao_externa', fornecedor: 'Assistec', retiradoPorNome: 'Diego', justificativa: 'Placa queimada' }),
      at('o3', { tipo: 'nao_informada' }),
    ] })
    const rows = within(await openTab(user)).getAllByRole('row').slice(1)
    const origin = (row: HTMLElement) => within(row).getAllByRole('cell').at(-1)
    expect(origin(rows[0])).toHaveTextContent('OT vinculada · Abrir OT')
    expect(within(rows[0]).getByRole('link', { name: 'Abrir OT' })).toHaveAttribute('href', '/work-orders/ot-1')
    expect(origin(rows[1])).toHaveTextContent('Externa · Assistec')
    expect(rows[1]).toHaveTextContent('Placa queimada')
    expect(rows[1]).toHaveTextContent('Retirado por: Diego')
    expect(rows[1]).not.toHaveTextContent('Parado')
    expect(origin(rows[2])).toHaveTextContent('Não informada')
    for (const row of rows) { expect(row).not.toHaveTextContent('Manual'); expect(row).not.toHaveTextContent('Origem:') }
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
