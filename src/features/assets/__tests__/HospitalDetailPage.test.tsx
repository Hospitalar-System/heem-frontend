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
import { chooseOption } from '@/test/select-helpers'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))

const hospital = { id: 'hospital-1', nome: 'Santa Casa', cnpj: '12345678000190' }
const sectors = [
  { id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI Adulto', andar: '2', classificacaoRisco: 'CRITICO', grupoInstalacao: 'GRUPO_2' },
  { id: 'sector-2', hospitalId: 'hospital-1', codigo: 'ST-02', nome: 'Radiologia', andar: null, classificacaoRisco: 'NAO_CRITICO', grupoInstalacao: 'GRUPO_0' },
]
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
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/hospitais') return { data: [hospital] } as never
    if (url === '/hospitais/hospital-1') return { data: hospital } as never
    if (url === '/hospitais/hospital-1/setores') return { data: sectors } as never
    if (url === '/equipamentos') return { data: equipments } as never
    if (url === '/setores/sector-1') return { data: sectors[0] } as never
    return { data: [] } as never
  })
  vi.mocked(apiClient.post).mockResolvedValue({ data: sectors[0] } as never)
  vi.mocked(apiClient.put).mockResolvedValue({ data: sectors[0] } as never)
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

  it('lista os setores com a contagem de equipamentos calculada de uma única chamada', async () => {
    renderDetail('/hospitals/hospital-1?aba=setores')
    expect(await screen.findByText('UTI Adulto')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('sector-count-sector-1')).toHaveTextContent('2'))
    expect(screen.getByTestId('sector-count-sector-2')).toHaveTextContent('1')
    const equipmentCalls = vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/equipamentos')
    expect(equipmentCalls).toHaveLength(1)
    expect(equipmentCalls[0][1]).toEqual({ params: { hospitalId: 'hospital-1' } })
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

  it('não oferece desativar setor: a API não expõe essa operação', async () => {
    const user = userEvent.setup()
    renderDetail('/hospitals/hospital-1?aba=setores')
    await user.click(await screen.findByRole('button', { name: 'Ações de UTI Adulto' }))
    expect(screen.queryByRole('menuitem', { name: /desativar/i })).not.toBeInTheDocument()
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
