import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { CategoriesPage } from '../pages/CategoriesPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const categories = [
  { id: 'cat-1', nome: 'Bomba de Infusão', ativa: true, checklistPadraoId: 'chk-1', origem: 'manual', revisada: true, quantidadeEquipamentos: 4 },
  { id: 'cat-2', nome: 'Monitor MX', ativa: true, checklistPadraoId: null, origem: 'carga', revisada: false, quantidadeEquipamentos: 12 },
  { id: 'cat-3', nome: 'Ventilador Pulmonar', ativa: false, checklistPadraoId: null, origem: 'manual', revisada: true, quantidadeEquipamentos: 0 },
]
const checklists = [{ id: 'chk-1', nome: 'Inspeção de bomba', ativo: true }, { id: 'chk-2', nome: 'Inspeção de monitor', ativo: true }, { id: 'chk-old', nome: 'Checklist antigo', ativo: false }]

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/categories']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/categories" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied">{children}</RequireRole>} />
    <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
  </Routes></MemoryRouter></QueryClientProvider>
}

function mockApi() {
  vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
    if (url === '/categorias-equipamento') {
      const params = (config?.params ?? {}) as { ativa?: boolean; revisar?: boolean }
      return { data: categories.filter((item) => (params.ativa === undefined || item.ativa === params.ativa) && (!params.revisar || (item.origem === 'carga' && !item.revisada))) } as never
    }
    if (url === '/checklists') return { data: checklists } as never
    return { data: [] } as never
  })
}

function problem(code: string, status = 409) {
  return Object.assign(new Error(code), { response: { status, data: { code } } })
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    mockApi()
  })

  it('lists name, default checklist, origin, equipment count, status and the review badge', async () => {
    render(<CategoriesPage />, { wrapper: TestProviders })
    await screen.findByText('Bomba de Infusão')
    const row = screen.getByRole('row', { name: /Bomba de Infusão/ })
    expect(await within(row).findByText('Inspeção de bomba')).toBeInTheDocument()
    expect(within(row).getByText('Manual')).toBeInTheDocument()
    expect(within(row).getByText('4')).toBeInTheDocument()
    expect(within(row).queryByText('Revisar')).not.toBeInTheDocument()
    const review = screen.getByRole('row', { name: /Monitor MX/ })
    expect(within(review).getByText('Revisar')).toBeInTheDocument()
    expect(within(review).getByText('Carga inicial')).toBeInTheDocument()
    expect(within(review).getByText('12')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Ventilador Pulmonar/ })).getByText('Inativa')).toBeInTheDocument()
  })

  it('sends ativa and revisar filters to the API and searches by name', async () => {
    const user = userEvent.setup()
    render(<CategoriesPage />, { wrapper: TestProviders })
    await screen.findByText('Bomba de Infusão')
    await chooseOption(user, 'Filtrar por situação', 'Inativas')
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/categorias-equipamento', { params: { ativa: false } }))
    expect(await screen.findByText('Ventilador Pulmonar')).toBeInTheDocument()
    expect(screen.queryByText('Bomba de Infusão')).not.toBeInTheDocument()
    await chooseOption(user, 'Filtrar por situação', 'Todas')
    await user.click(screen.getByRole('checkbox', { name: 'A revisar' }))
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/categorias-equipamento', { params: { revisar: true } }))
    await waitFor(() => expect(screen.queryByText('Bomba de Infusão')).not.toBeInTheDocument())
    expect(screen.getByText('Monitor MX')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'A revisar' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar categoria' }), 'ventilador')
    expect(await screen.findByText('Ventilador Pulmonar')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Monitor MX')).not.toBeInTheDocument())
  })

  it('creates a category with name and default checklist (only active checklists offered)', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} } as never)
    render(<CategoriesPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: /Nova categoria/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), '  Desfibrilador ')
    await user.click(within(dialog).getByRole('combobox', { name: /Checklist padrão/ }))
    expect(within(await screen.findByRole('listbox')).queryByRole('option', { name: 'Checklist antigo' })).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Inspeção de monitor' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar categoria' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/categorias-equipamento', { nome: 'Desfibrilador', ativa: true, checklistPadraoId: 'chk-2' }))
  })

  it('validates a required name and shows the duplicate error from the API by code', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(problem('CATEGORIA_DUPLICADA'))
    render(<CategoriesPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: /Nova categoria/ }))
    const dialog = await screen.findByRole('dialog')
    const nameInput = within(dialog).getByLabelText('Nome')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar categoria' }))
    expect(await within(dialog).findByText('Informe o nome da categoria.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
    await user.type(nameInput, 'bomba de infusao')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar categoria' }))
    expect(await within(dialog).findByText(/Já existe uma categoria com este nome/)).toBeInTheDocument()
  })

  it('edits a category with PUT, sending null when the default checklist is cleared', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} } as never)
    render(<CategoriesPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Editar Bomba de Infusão' }))
    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByLabelText('Nome')
    expect(name).toHaveValue('Bomba de Infusão')
    await user.clear(name)
    await user.type(name, 'Bomba')
    await chooseOption(user, within(dialog).getByRole('combobox', { name: /Checklist padrão/ }), 'Sem checklist padrão')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Categoria ativa' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar categoria' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/categorias-equipamento/cat-1', { nome: 'Bomba', ativa: false, checklistPadraoId: null }))
  })

  it('deactivates only after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.delete).mockResolvedValue({ data: null } as never)
    render(<CategoriesPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Desativar Bomba de Infusão' }))
    const dialog = await screen.findByRole('dialog')
    expect(apiClient.delete).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(apiClient.delete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Desativar Bomba de Infusão' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desativar categoria' }))
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/categorias-equipamento/cat-1'))
    expect(screen.queryByRole('button', { name: 'Desativar Ventilador Pulmonar' })).not.toBeInTheDocument()
  })

  it('marks a loaded category as reviewed and offers the action only when it needs review', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} } as never)
    render(<CategoriesPage />, { wrapper: TestProviders })
    await screen.findByText('Monitor MX')
    expect(screen.queryByRole('button', { name: 'Marcar Bomba de Infusão como revisada' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Marcar Monitor MX como revisada' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/categorias-equipamento/cat-2/revisada'))
  })

  it('merges the chosen origin into the target category after warning about the effects', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} } as never)
    render(<CategoriesPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Mesclar em Bomba de Infusão' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('note')).toHaveTextContent(/serão movidos para "Bomba de Infusão".*origem será desativada/)
    await user.click(within(dialog).getByRole('button', { name: 'Mesclar categorias' }))
    expect(await within(dialog).findByText('Selecione a categoria de origem.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('combobox', { name: 'Categoria de origem' }))
    const options = within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Monitor MX'])
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Monitor MX' }))
    await user.click(within(dialog).getByRole('button', { name: 'Mesclar categorias' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/categorias-equipamento/cat-1/mesclar', { origemId: 'cat-2' }))
  })

  it('shows invalid-merge errors by code in pt-BR', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(problem('MESCLAGEM_INVALIDA', 400))
    render(<CategoriesPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Mesclar em Bomba de Infusão' }))
    const dialog = await screen.findByRole('dialog')
    await chooseOption(user, within(dialog).getByRole('combobox', { name: 'Categoria de origem' }), 'Monitor MX')
    await user.click(within(dialog).getByRole('button', { name: 'Mesclar categorias' }))
    expect(await within(dialog).findByText(/Não é possível mesclar/)).toBeInTheDocument()
  })

  it('shows loading, error with retry and empty states', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/categorias-equipamento') throw new Error('falha')
      return { data: [] } as never
    })
    render(<CategoriesPage />, { wrapper: TestProviders })
    expect(await screen.findByLabelText('Carregando categorias')).toBeInTheDocument()
    expect(await screen.findByText('Não foi possível carregar as categorias.')).toBeInTheDocument()
    vi.mocked(apiClient.get).mockImplementation(async () => ({ data: [] }) as never)
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Nenhuma categoria cadastrada')).toBeInTheDocument()
  })

  it('redirects technicians and hospital staff away from the screen and hides the menu entry', async () => {
    for (const role of ['tecnico', 'interno_hospital'] as const) {
      clearAuthSession()
      setAuthSession('token', { id: 'user-2', name: 'Rafael', roles: [role], tenantId: 'tenant-1' })
      const view = render(<CategoriesPage />, { wrapper: TestProviders })
      expect(await screen.findByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
      expect(apiClient.get).not.toHaveBeenCalledWith('/categorias-equipamento', expect.anything())
      view.unmount()
      const utils = render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
      expect(screen.queryByRole('link', { name: 'Categorias' })).not.toBeInTheDocument()
      utils.unmount()
    }
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categories')
  })
})
