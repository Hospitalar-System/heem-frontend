import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useState, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { AssetsPage } from '../pages/AssetsPage'
import { chooseOption } from '@/test/select-helpers'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

const equipment = {
  id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-0471', nome: 'Ventilador VentPro', modelo: 'VentPro X3', numeroSerie: '4471-A',
  marca: 'MedTech', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'II', statusCicloVida: 'ATIVO', criticidade: 'MEDIA',
  tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: null, dataGarantiaFim: null, nivelRisco: 'BAIXO',
}

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/assets']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets" element={children} /><Route path="/assets/:id" element={<RouteLocation />} /></Routes></MemoryRouter></QueryClientProvider>
}

function RouteLocation() {
  const location = useLocation()
  return <div data-testid="current-route">{location.pathname}</div>
}

describe('AssetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'user-1', name: 'Ana', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/equipamentos') return { data: [equipment] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI Adulto' }] } as never
      return { data: [] } as never
    })
  })

  it('renders API equipment and navigates from its row to the detail route', async () => {
    const user = userEvent.setup()
    render(<AssetsPage />, { wrapper: TestProviders })

    expect(await screen.findByText('Ventilador VentPro')).toBeInTheDocument()
    const row = await screen.findByRole('link', { name: 'Abrir EQ-0471, Ventilador VentPro' })
    expect(within(row).getByText('UTI Adulto')).toBeInTheDocument()
    expect(within(row).getByText('Ativo')).toBeInTheDocument()
    expect(within(row).getByText('—')).toBeInTheDocument()
    await user.click(row)
    expect(await screen.findByTestId('current-route')).toHaveTextContent('/assets/equipment-1')
  })

  it('applies text and lifecycle filters to the equipment list', async () => {
    render(<AssetsPage />, { wrapper: TestProviders })
    const search = await screen.findByRole('searchbox', { name: 'Buscar equipamento' })
    fireEvent.change(search, { target: { value: 'not found' } })
    expect(await screen.findByText('Nenhum equipamento encontrado')).toBeInTheDocument()
    await chooseOption(userEvent.setup(), 'Filtrar por status', 'Ativo')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(await screen.findByText('Ventilador VentPro')).toBeInTheDocument()
  })

  it('loads the list thumbnail lazily, only for equipment with a photo and only once the row is visible', async () => {
    const observers: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = []
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) { observers.push(callback) } observe() {} disconnect() {} })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/equipamentos') return { data: [{ ...equipment, fotoVersao: '2026-10-01T10:00:00Z' }, { ...equipment, id: 'equipment-2', codigo: 'EQ-2', nome: 'Monitor', fotoVersao: null }] } as never
      if (url === '/equipamentos/equipment-1/foto/miniatura') return { data: { url: 'https://img/mini.jpg' } } as never
      return { data: [] } as never
    })
    render(<AssetsPage />, { wrapper: TestProviders })
    await screen.findByText('Ventilador VentPro')
    expect(apiClient.get).not.toHaveBeenCalledWith('/equipamentos/equipment-1/foto/miniatura')
    observers.forEach((callback) => callback([{ isIntersecting: true }]))
    expect(await screen.findByAltText('Miniatura de Ventilador VentPro')).toHaveAttribute('src', 'https://img/mini.jpg')
    expect(apiClient.get).not.toHaveBeenCalledWith('/equipamentos/equipment-2/foto/miniatura')
    vi.unstubAllGlobals()
  })
})
