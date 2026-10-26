import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption, listOptions } from '@/test/select-helpers'
import { AssetsPage } from '../pages/AssetsPage'
import { EquipmentDetailPage } from '../pages/EquipmentDetailPage'
import { EquipmentFormPage } from '../pages/EquipmentFormPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const categories = [
  { id: 'cat-1', nome: 'Bomba de Infusão', ativa: true, checklistPadraoId: null, origem: 'manual', revisada: true },
  { id: 'cat-2', nome: 'Monitor MX', ativa: true, checklistPadraoId: null, origem: 'carga', revisada: false },
  { id: 'cat-old', nome: 'Categoria Antiga', ativa: false, checklistPadraoId: null, origem: 'manual', revisada: true },
]
const base = {
  setorId: 'sector-1', modelo: null, numeroSerie: null, marca: null, fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'II',
  statusCicloVida: 'ATIVO', criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO',
  dataInstalacao: null, dataGarantiaFim: null, nivelRisco: 'BAIXO',
}
const withCategory = { ...base, id: 'eq-1', codigo: 'EQ-1', nome: 'Bomba 01', categoriaId: 'cat-1', categoriaNome: 'Bomba de Infusão' }
const legacy = { ...base, id: 'eq-2', codigo: 'EQ-2', nome: 'Monitor antigo', categoriaId: null, categoriaNome: null }
const onInactive = { ...base, id: 'eq-3', codigo: 'EQ-3', nome: 'Bomba velha', categoriaId: 'cat-old', categoriaNome: 'Categoria Antiga' }

function Providers({ path, entry }: { path: string; entry: string }) {
  return function TestProviders({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
      <Route path={path} element={children} />
      <Route path="/assets/:id" element={<h1>Ficha aberta</h1>} />
    </Routes></MemoryRouter></QueryClientProvider>
  }
}

function mockApi(equipments: Array<typeof withCategory | typeof legacy | typeof onInactive> = [withCategory, legacy]) {
  vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
    const params = (config?.params ?? {}) as { categoriaId?: string; semCategoria?: boolean }
    if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
    if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI Adulto' }] } as never
    if (url === '/setores/sector-1') return { data: { id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI Adulto' } } as never
    if (url === '/hospitais/hospital-1') return { data: { id: 'hospital-1', nome: 'Santa Casa' } } as never
    if (url === '/categorias-equipamento') return { data: categories } as never
    if (url === '/equipamentos') return { data: equipments.filter((item) => (!params.semCategoria || !item.categoriaId) && (!params.categoriaId || item.categoriaId === params.categoriaId)) } as never
    const detail = String(url).match(/^\/equipamentos\/([^/]+)$/)
    if (detail) return { data: equipments.find((item) => item.id === detail[1]) } as never
    return { data: [] } as never
  })
}

function problem(code: string, status: number) {
  return Object.assign(new Error(code), { response: { status, data: { code } } })
}

describe('equipment category on the list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    mockApi()
  })

  it('shows the category column and "Sem categoria" for legacy equipment', async () => {
    render(<AssetsPage />, { wrapper: Providers({ path: '/assets', entry: '/assets' }) })
    const row = (await screen.findByRole('link', { name: 'Abrir EQ-1, Bomba 01' }))
    expect(within(row).getByText('Bomba de Infusão')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: 'Abrir EQ-2, Monitor antigo' })).getByText('Sem categoria')).toBeInTheDocument()
  })

  it('filters by category and by "Sem categoria" through the API parameters', async () => {
    const user = userEvent.setup()
    render(<AssetsPage />, { wrapper: Providers({ path: '/assets', entry: '/assets' }) })
    await screen.findByRole('link', { name: 'Abrir EQ-1, Bomba 01' })
    await chooseOption(user, 'Filtrar por categoria', 'Bomba de Infusão')
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/equipamentos', { params: expect.objectContaining({ categoriaId: 'cat-1' }) }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Abrir EQ-2, Monitor antigo' })).not.toBeInTheDocument())
    await chooseOption(user, 'Filtrar por categoria', 'Sem categoria')
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/equipamentos', { params: expect.objectContaining({ semCategoria: true }) }))
    expect(await screen.findByRole('link', { name: 'Abrir EQ-2, Monitor antigo' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir EQ-1, Bomba 01' })).not.toBeInTheDocument()
  })
})

describe('equipment category on the detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    mockApi()
  })

  it('shows the category name on the data sheet', async () => {
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    render(<EquipmentDetailPage />, { wrapper: Providers({ path: '/assets/:id', entry: '/assets/eq-1' }) })
    expect(await screen.findByText('Bomba de Infusão')).toBeInTheDocument()
  })

  it('offers admins a call to define the category of a legacy equipment', async () => {
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    render(<EquipmentDetailPage />, { wrapper: Providers({ path: '/assets/:id', entry: '/assets/eq-2' }) })
    expect(await screen.findByText('Sem categoria')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Definir categoria' })).toHaveAttribute('href', '/assets/eq-2/edit')
  })

  it('does not offer the call to technicians', async () => {
    setAuthSession('token', { id: 'tech-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
    render(<EquipmentDetailPage />, { wrapper: Providers({ path: '/assets/:id', entry: '/assets/eq-2' }) })
    expect(await screen.findByText('Sem categoria')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Definir categoria' })).not.toBeInTheDocument()
  })
})

describe('EquipmentFormPage category', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    mockApi()
  })

  async function fillNewEquipment(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText('Código'), 'EQ-9')
    await user.type(screen.getByLabelText('Nome'), 'Bomba 09')
    await chooseOption(user, screen.getByRole('combobox', { name: 'Hospital' }), 'Santa Casa')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Setor' })).toBeEnabled())
    await chooseOption(user, screen.getByRole('combobox', { name: 'Setor' }), /UTI Adulto/)
  }

  it('requires a category to register equipment and lists only active categories', async () => {
    const user = userEvent.setup()
    render(<EquipmentFormPage />, { wrapper: Providers({ path: '/assets/new', entry: '/assets/new' }) })
    await fillNewEquipment(user)
    expect(await listOptions(user, screen.getByRole('combobox', { name: /Categoria/ }))).toEqual(['Bomba de Infusão', 'Monitor MX'])
    await user.click(screen.getByRole('button', { name: 'Cadastrar equipamento' }))
    expect(await screen.findByText('Selecione uma categoria.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('sends categoriaId when creating', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'eq-9' } } as never)
    render(<EquipmentFormPage />, { wrapper: Providers({ path: '/assets/new', entry: '/assets/new' }) })
    await fillNewEquipment(user)
    await chooseOption(user, screen.getByRole('combobox', { name: /Categoria/ }), 'Monitor MX')
    await user.click(screen.getByRole('button', { name: 'Cadastrar equipamento' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/equipamentos', expect.objectContaining({ categoriaId: 'cat-2', codigo: 'EQ-9' })))
  })

  it('maps CATEGORIA_INVALIDA to a pt-BR message on the category field', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(problem('CATEGORIA_INVALIDA', 409))
    render(<EquipmentFormPage />, { wrapper: Providers({ path: '/assets/new', entry: '/assets/new' }) })
    await fillNewEquipment(user)
    await chooseOption(user, screen.getByRole('combobox', { name: /Categoria/ }), 'Monitor MX')
    await user.click(screen.getByRole('button', { name: 'Cadastrar equipamento' }))
    expect((await screen.findAllByText(/A categoria escolhida não existe ou está desativada/)).length).toBeGreaterThan(0)
  })

  it('preloads the current category when editing and sends it back', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 'eq-1' } } as never)
    render(<EquipmentFormPage />, { wrapper: Providers({ path: '/assets/:id/edit', entry: '/assets/eq-1/edit' }) })
    const category = await screen.findByRole('combobox', { name: /Categoria/ })
    await waitFor(() => expect(category).toHaveTextContent('Bomba de Infusão'))
    await chooseOption(user, category, 'Monitor MX')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/equipamentos/eq-1', expect.objectContaining({ categoriaId: 'cat-2' })))
  })

  it('forces legacy equipment without category to pick one before saving', async () => {
    const user = userEvent.setup()
    mockApi([legacy])
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 'eq-2' } } as never)
    render(<EquipmentFormPage />, { wrapper: Providers({ path: '/assets/:id/edit', entry: '/assets/eq-2/edit' }) })
    const category = await screen.findByRole('combobox', { name: /Categoria/ })
    await user.click(await screen.findByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Selecione uma categoria.')).toBeInTheDocument()
    expect(apiClient.put).not.toHaveBeenCalled()
    await chooseOption(user, category, 'Bomba de Infusão')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/equipamentos/eq-2', expect.objectContaining({ categoriaId: 'cat-1' })))
  })

  it('keeps an inactive current category selectable while editing', async () => {
    const user = userEvent.setup()
    mockApi([onInactive])
    render(<EquipmentFormPage />, { wrapper: Providers({ path: '/assets/:id/edit', entry: '/assets/eq-3/edit' }) })
    const category = await screen.findByRole('combobox', { name: /Categoria/ })
    await waitFor(() => expect(category).toHaveTextContent('Categoria Antiga'))
    expect(await listOptions(user, category)).toEqual(['Bomba de Infusão', 'Monitor MX', 'Categoria Antiga (inativa)'])
  })
})
