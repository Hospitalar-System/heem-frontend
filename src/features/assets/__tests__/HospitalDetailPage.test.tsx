import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { HospitalDetailPage } from '../pages/HospitalDetailPage'
import { HospitalsPage } from '../pages/HospitalsPage'
import { toast } from 'sonner'
import { chooseOption, listOptions } from '@/test/select-helpers'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))

const hospital = { id: 'hospital-1', nome: 'Santa Casa', cnpj: '12345678000190' }
const sectors = [
  { id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI Adulto', andar: '2', classificacaoRisco: 'CRITICO', grupoInstalacao: 'GRUPO_2', ativo: true, equipamentosAtivos: 2, equipamentosTotal: 3 },
  { id: 'sector-2', hospitalId: 'hospital-1', codigo: 'ST-02', nome: 'Radiologia', andar: null, classificacaoRisco: 'NAO_CRITICO', grupoInstalacao: 'GRUPO_0', ativo: true, equipamentosAtivos: 0, equipamentosTotal: 0 },
]
const inactiveSector = { id: 'sector-3', hospitalId: 'hospital-1', codigo: 'ST-03', nome: 'Almoxarifado', andar: null, classificacaoRisco: 'NAO_CRITICO', grupoInstalacao: 'GRUPO_0', ativo: false, equipamentosAtivos: 0, equipamentosTotal: 1 }
const problem = (status: number, data: Record<string, unknown>) => Object.assign(new Error(String(data.code)), { response: { status, data } })
const equipment = (id: string, setorId: string, nome: string) => ({ id, setorId, codigo: `EQ-${id}`, nome, modelo: 'X', numeroSerie: id, statusCicloVida: 'ATIVO', categoriaNome: null })
const equipments = [equipment('1', 'sector-1', 'Ventilador'), equipment('2', 'sector-1', 'Monitor'), equipment('3', 'sector-2', 'Raio X')]

function Location() {
  const location = useLocation()
  return <div data-testid="where">{location.pathname}{location.search}</div>
}

function Providers({ children, initial = '/hospitals/hospital-1' }: PropsWithChildren<{ initial?: string }>) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}<Location /></MemoryRouter></QueryClientProvider>
}

function renderDetail(initial?: string) {
  return render(<Routes><Route path="/hospitals/:id" element={<HospitalDetailPage />} /></Routes>, { wrapper: ({ children }) => <Providers initial={initial}>{children}</Providers> })
}

beforeEach(() => {
  vi.clearAllMocks()
  clearAuthSession()
  setAuthSession('token', { id: 'user-1', name: 'Ana', roles: ['admin_cliente'], tenantId: 'tenant-1' })
  vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
    if (url === '/hospitais') return { data: [hospital] } as never
    if (url === '/hospitais/hospital-1') return { data: hospital } as never
    if (url === '/hospitais/hospital-1/setores') {
      const ativo = (config as { params?: { ativo?: string } } | undefined)?.params?.ativo ?? 'true'
      const all = [...sectors, inactiveSector]
      const data = all.filter((sector) => ativo === 'todos' || String(sector.ativo) === ativo)
      return { data, headers: { 'x-total-count': String(data.length) } } as never
    }
    if (url === '/equipamentos') return { data: equipments } as never
    if (url === '/setores/sector-1') return { data: sectors[0] } as never
    return { data: [] } as never
  })
  vi.mocked(apiClient.post).mockResolvedValue({ data: sectors[0] } as never)
  vi.mocked(apiClient.put).mockResolvedValue({ data: sectors[0] } as never)
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...sectors[0], ativo: false } } as never)
})

describe('HospitalsPage', () => {
  it('abre /hospitals/:id ao clicar na linha e pelo link do nome (teclado)', async () => {
    const user = userEvent.setup()
    render(<Routes><Route path="/hospitals" element={<HospitalsPage />} /><Route path="/hospitals/:id" element={<p>detalhe</p>} /></Routes>, { wrapper: ({ children }) => <Providers initial="/hospitals">{children}</Providers> })
    const link = await screen.findByRole('link', { name: 'Santa Casa' })
    expect(link).toHaveAttribute('href', '/hospitals/hospital-1')
    await user.click(screen.getByRole('cell', { name: '12.345.678/0001-90' }))
    expect(await screen.findByText('detalhe')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/hospitals/hospital-1')
  })

  it('abrir o menu de ações da linha não navega', async () => {
    const user = userEvent.setup()
    render(<Routes><Route path="/hospitals" element={<HospitalsPage />} /><Route path="/hospitals/:id" element={<p>detalhe</p>} /></Routes>, { wrapper: ({ children }) => <Providers initial="/hospitals">{children}</Providers> })
    await user.click(await screen.findByRole('button', { name: 'Ações de Santa Casa' }))
    expect(await screen.findByRole('menuitem', { name: 'Editar hospital' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/hospitals')
    expect(screen.queryByText('detalhe')).not.toBeInTheDocument()
  })
})

describe('HospitalDetailPage', () => {
  it('mostra as abas Dados, Setores e Equipamentos com aria-selected e atualiza ?aba=', async () => {
    const user = userEvent.setup()
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Santa Casa' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dados' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('12.345.678/0001-90')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Setores' }))
    expect(screen.getByRole('tab', { name: 'Setores' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Dados' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByTestId('where')).toHaveTextContent('?aba=setores')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Equipamentos' })).toHaveAttribute('aria-selected', 'true')
  })

  it('mostra a situação e a contagem de equipamentos do servidor, sem calcular no cliente', async () => {
    renderDetail('/hospitals/hospital-1?aba=setores')
    expect(await screen.findByText('UTI Adulto')).toBeInTheDocument()
    expect(screen.getByTestId('sector-count-sector-1')).toHaveTextContent('2 ativos / 3')
    expect(screen.getByTestId('sector-count-sector-2')).toHaveTextContent('0 ativos / 0')
    expect(screen.getAllByText('Ativo').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('Almoxarifado')).not.toBeInTheDocument()
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/hospitais/hospital-1/setores', { params: expect.objectContaining({ ativo: 'true', pagina: 0, tamanho: 25 }) })
  })

  it('o filtro Inativos/Todos envia ?ativo= ao servidor', async () => {
    const user = userEvent.setup()
    renderDetail('/hospitals/hospital-1?aba=setores')
    await screen.findByText('UTI Adulto')
    await chooseOption(user, 'Filtrar setores por situação', 'Inativos')
    expect(await screen.findByText('Almoxarifado')).toBeInTheDocument()
    expect(screen.getByText('Inativo')).toBeInTheDocument()
    expect(screen.queryByText('UTI Adulto')).not.toBeInTheDocument()
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/hospitais/hospital-1/setores', { params: expect.objectContaining({ ativo: 'false' }) })
    await chooseOption(user, 'Filtrar setores por situação', 'Todos')
    expect(await screen.findByText('UTI Adulto')).toBeInTheDocument()
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/hospitais/hospital-1/setores', { params: expect.objectContaining({ ativo: 'todos' }) })
  })

  it('cria um setor no hospital', async () => {
    const user = userEvent.setup()
    renderDetail('/hospitals/hospital-1?aba=setores')
    await screen.findByText('UTI Adulto')
    await user.click(screen.getByRole('button', { name: /Novo setor/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Novo setor' })
    await user.type(within(dialog).getByLabelText('Código'), 'ST-09')
    await user.type(within(dialog).getByLabelText('Nome'), 'Centro Cirúrgico')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar setor' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/hospitais/hospital-1/setores', expect.objectContaining({ codigo: 'ST-09', nome: 'Centro Cirúrgico' })))
  })

  it('edita um setor pelo menu da linha', async () => {
    const user = userEvent.setup()
    renderDetail('/hospitals/hospital-1?aba=setores')
    await user.click(await screen.findByRole('button', { name: 'Ações de UTI Adulto' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar setor' })
    await waitFor(() => expect(within(dialog).getByLabelText('Nome')).toHaveValue('UTI Adulto'))
    await user.clear(within(dialog).getByLabelText('Nome'))
    await user.type(within(dialog).getByLabelText('Nome'), 'UTI Geral')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar setor' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/setores/sector-1', expect.objectContaining({ nome: 'UTI Geral' })))
  })

  it('desativa o setor depois de confirmar', async () => {
    const user = userEvent.setup()
    renderDetail('/hospitals/hospital-1?aba=setores')
    await user.click(await screen.findByRole('button', { name: 'Ações de Radiologia' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Desativar' }))
    const dialog = await screen.findByRole('dialog', { name: /Desativar o setor Radiologia/ })
    expect(apiClient.patch).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/setores/sector-2', { ativo: false }))
  })

  it('mostra quantos equipamentos ativos impedem a desativação (409)', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.patch).mockRejectedValue(problem(409, { code: 'SETOR_COM_EQUIPAMENTOS_ATIVOS', equipamentosAtivos: 2 }))
    renderDetail('/hospitals/hospital-1?aba=setores')
    await user.click(await screen.findByRole('button', { name: 'Ações de UTI Adulto' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Desativar' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Este setor tem 2 equipamentos ativos. Transfira ou desative os equipamentos antes.'))
  })

  it('reativa um setor inativo e trata hospital desativado', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.patch).mockRejectedValueOnce(problem(409, { code: 'HOSPITAL_DESATIVADO' }))
    renderDetail('/hospitals/hospital-1?aba=setores&ativo=false')
    await user.click(await screen.findByRole('button', { name: 'Ações de Almoxarifado' }))
    expect(screen.queryByRole('menuitem', { name: 'Desativar' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('menuitem', { name: 'Reativar' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/setores/sector-3', { ativo: true }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/hospital deste setor está desativado/)))
  })

  it('quem não é admin_cliente não vê desativar nem reativar', async () => {
    const user = userEvent.setup()
    setAuthSession('token', { id: 'user-2', name: 'Téc', roles: ['tecnico'], tenantId: 'tenant-1' })
    renderDetail('/hospitals/hospital-1?aba=setores')
    await user.click(await screen.findByRole('button', { name: 'Ações de UTI Adulto' }))
    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /desativar|reativar/i })).not.toBeInTheDocument()
  })

  it('na aba Equipamentos o filtro de setor lista só setores ativos', async () => {
    const user = userEvent.setup()
    renderDetail('/hospitals/hospital-1?aba=equipamentos')
    await screen.findByRole('link', { name: 'Abrir EQ-1, Ventilador' })
    const labels = await listOptions(user, 'Filtrar por setor')
    expect(labels).toEqual(['Todos os setores', 'UTI Adulto', 'Radiologia'])
  })

  it('lista só os equipamentos do hospital, com filtro por setor e link para a ficha', async () => {
    const user = userEvent.setup()
    renderDetail('/hospitals/hospital-1?aba=equipamentos')
    const row = await screen.findByRole('link', { name: 'Abrir EQ-1, Ventilador' })
    expect(within(row).getByText('UTI Adulto')).toBeInTheDocument()
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/equipamentos', { params: { hospitalId: 'hospital-1' } })
    await chooseOption(user, 'Filtrar por setor', 'Radiologia')
    expect(screen.queryByText('Ventilador')).not.toBeInTheDocument()
    expect(screen.getByText('Raio X')).toBeInTheDocument()
  })

  it('aba inválida cai em Dados', async () => {
    renderDetail('/hospitals/hospital-1?aba=xyz')
    expect(await screen.findByRole('tab', { name: 'Dados' })).toHaveAttribute('aria-selected', 'true')
  })
})
