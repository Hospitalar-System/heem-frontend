import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { chooseOption } from '@/test/select-helpers'
import { AssetsPage } from '../pages/AssetsPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{children}</main>,
}))

const make = (n: number) => ({
  id: `eq-${n}`, setorId: 'sector-1', codigo: `EQ-${String(n).padStart(3, '0')}`, nome: `Equipamento ${String(n).padStart(3, '0')}`, modelo: 'M', numeroSerie: String(n),
  fotoUrl: null, dadosGerais: {}, statusCicloVida: n % 2 ? 'ATIVO' : 'INATIVO',
})
const all = Array.from({ length: 60 }, (_, i) => make(i + 1))
const categories = [{ id: 'cat-1', nome: 'Bomba', ativa: true }, { id: 'cat-2', nome: 'Monitor', ativa: true }]
let entry = '/assets'

function Where() {
  const location = useLocation()
  return <div data-testid="where">{location.pathname}{location.search}</div>
}

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}<Where /></MemoryRouter></QueryClientProvider>
}

function equipmentCalls() {
  return vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/equipamentos').map(([, config]) => (config as { params: Record<string, unknown> }).params)
}

describe('AssetsPage: paginação e ordenação no servidor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    entry = '/assets'
    clearAuthSession()
    setAuthSession('token', { id: 'user-1', name: 'Ana', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
      const params = ((config as { params?: Record<string, unknown> } | undefined)?.params ?? {}) as { pagina?: number; tamanho?: number; ordenar?: string; direcao?: string; q?: string; status?: string }
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/categorias-equipamento') return { data: categories } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI Adulto' }] } as never
      if (url === '/equipamentos') {
        const filtered = all
          .filter((item) => !params.q || item.nome.toLowerCase().includes(params.q.toLowerCase()))
          .filter((item) => !params.status || item.statusCicloVida.toLowerCase() === params.status)
        const sorted = params.ordenar === 'nome' && params.direcao === 'desc' ? [...filtered].reverse() : filtered
        const size = params.tamanho ?? 50
        const page = params.pagina ?? 0
        return { data: sorted.slice(page * size, (page + 1) * size), headers: { 'x-total-count': String(filtered.length) } } as never
      }
      return { data: [] } as never
    })
  })

  it('envia pagina/tamanho, mostra total e intervalo e troca de página e de tamanho', async () => {
    const user = userEvent.setup()
    render(<AssetsPage />, { wrapper: Providers })
    expect(await screen.findByText('Mostrando 1–25 de 60')).toBeInTheDocument()
    expect(equipmentCalls()[0]).toEqual({ pagina: 0, tamanho: 25 })
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(await screen.findByText('Mostrando 26–50 de 60')).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('pagina=2')
    expect(equipmentCalls().at(-1)).toEqual({ pagina: 1, tamanho: 25 })
    await chooseOption(user, 'Itens por página', '50')
    expect(await screen.findByText('Mostrando 1–50 de 60')).toBeInTheDocument()
    expect(equipmentCalls().at(-1)).toEqual({ pagina: 0, tamanho: 50 })
  })

  it('filtro de categoria e de documentos voltam para a página 1 e vão ao servidor', async () => {
    const user = userEvent.setup()
    entry = '/assets?pagina=2'
    render(<AssetsPage />, { wrapper: Providers })
    await screen.findByText('Mostrando 26–50 de 60')
    await chooseOption(user, 'Filtrar por categoria', 'Bomba')
    await waitFor(() => expect(equipmentCalls().at(-1)).toEqual({ categoriaId: 'cat-1', pagina: 0, tamanho: 25 }))
    expect(screen.getByTestId('where')).not.toHaveTextContent('pagina=')
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await screen.findByText('Mostrando 26–50 de 60')
    await chooseOption(user, 'Filtrar por documentos', 'Documento vencido')
    await waitFor(() => expect(equipmentCalls().at(-1)).toEqual({ categoriaId: 'cat-1', documentoVencido: true, pagina: 0, tamanho: 25 }))
    expect(screen.getByTestId('where')).toHaveTextContent('documentos=vencido')
    expect(screen.getByTestId('where')).not.toHaveTextContent('pagina=')
  })

  it('o seletor de categoria usa a lista completa (sem pagina/tamanho)', async () => {
    render(<AssetsPage />, { wrapper: Providers })
    await screen.findByText('Mostrando 1–25 de 60')
    expect(apiClient.get).toHaveBeenCalledWith('/categorias-equipamento', { params: {} })
  })

  it('cabeçalhos Nome, Código e Categoria ordenam com aria-sort e ordenar/direcao na URL; ordenar volta à página 1', async () => {
    const user = userEvent.setup()
    entry = '/assets?pagina=2'
    render(<AssetsPage />, { wrapper: Providers })
    await screen.findByText('Mostrando 26–50 de 60')
    const header = (name: RegExp) => screen.getByRole('columnheader', { name })
    expect(header(/Nome/)).toHaveAttribute('aria-sort', 'none')
    expect(screen.queryByRole('columnheader', { name: /Modelo/ })).not.toHaveAttribute('aria-sort')
    await user.click(within(header(/Nome/)).getByRole('button'))
    await waitFor(() => expect(header(/Nome/)).toHaveAttribute('aria-sort', 'ascending'))
    expect(screen.getByTestId('where')).toHaveTextContent('/assets?ordenar=nome')
    expect(equipmentCalls().at(-1)).toEqual({ pagina: 0, tamanho: 25, ordenar: 'nome', direcao: 'asc' })
    await user.click(within(header(/Nome/)).getByRole('button'))
    await waitFor(() => expect(header(/Nome/)).toHaveAttribute('aria-sort', 'descending'))
    expect(equipmentCalls().at(-1)).toEqual({ pagina: 0, tamanho: 25, ordenar: 'nome', direcao: 'desc' })
    await user.click(within(header(/Categoria/)).getByRole('button'))
    await waitFor(() => expect(header(/Categoria/)).toHaveAttribute('aria-sort', 'ascending'))
    expect(header(/Nome/)).toHaveAttribute('aria-sort', 'none')
    expect(equipmentCalls().at(-1)).toEqual({ pagina: 0, tamanho: 25, ordenar: 'categoria', direcao: 'asc' })
  })

  it('status e busca vão ao servidor, voltam à página 1, ficam na URL e o total reflete o filtro', async () => {
    entry = '/assets?pagina=2'
    const user = userEvent.setup()
    render(<AssetsPage />, { wrapper: Providers })
    await screen.findByText('Mostrando 26–50 de 60')
    await chooseOption(user, 'Filtrar por status', 'Inativo')
    expect(await screen.findByText('Mostrando 1–25 de 30')).toBeInTheDocument()
    expect(equipmentCalls().at(-1)).toEqual({ pagina: 0, tamanho: 25, status: 'inativo' })
    expect(screen.getByTestId('where')).toHaveTextContent('status=inativo')
    expect(screen.getByTestId('where')).not.toHaveTextContent('pagina=')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const callsBefore = equipmentCalls().length
      fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar equipamento' }), { target: { value: 'equipamento 01' } })
      expect(equipmentCalls()).toHaveLength(callsBefore)
      await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    } finally { vi.useRealTimers() }
    expect(await screen.findByText('Mostrando 1–5 de 5')).toBeInTheDocument()
    expect(equipmentCalls().at(-1)).toEqual({ pagina: 0, tamanho: 25, status: 'inativo', q: 'equipamento 01' })
    expect(screen.getByTestId('where')).toHaveTextContent('q=equipamento+01')
  })

  it('volta uma página quando a página atual esvazia', async () => {
    entry = '/assets?pagina=9'
    vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
      if (url === '/equipamentos') {
        const page = ((config as { params: { pagina: number } }).params.pagina)
        return { data: page === 0 ? all.slice(0, 25) : [], headers: { 'x-total-count': '25' } } as never
      }
      return { data: [] } as never
    })
    render(<AssetsPage />, { wrapper: Providers })
    expect(await screen.findByText('Mostrando 1–25 de 25')).toBeInTheDocument()
    expect(screen.getByTestId('where')).not.toHaveTextContent('pagina=')
  })
})
