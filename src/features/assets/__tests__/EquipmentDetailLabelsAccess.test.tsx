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

const equipment = {
  id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-001', nome: 'Bomba de infusão', modelo: null, numeroSerie: null,
  marca: null, fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'II', statusCicloVida: 'ATIVO', criticidade: 'MEDIA',
  tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: null,
  dataGarantiaFim: null, nivelRisco: 'BAIXO',
}

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/assets/equipment-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets/:id" element={children} /></Routes></MemoryRouter></QueryClientProvider>
}

describe('EquipmentDetailPage labels access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/equipamentos/equipment-1') return { data: equipment } as never
      if (url === '/setores/sector-1') return { data: { id: 'sector-1', hospitalId: 'hospital-1', nome: 'UTI' } } as never
      if (url === '/hospitais/hospital-1') return { data: { id: 'hospital-1', nome: 'Hospital' } } as never
      if (url === '/ordens-de-trabalho') return { data: [] } as never
      return { data: [] } as never
    })
  })

  it('shows and loads the labels section for a client administrator', async () => {
    const user = userEvent.setup()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    render(<EquipmentDetailPage />, { wrapper: TestProviders })

    await user.click(await screen.findByRole('tab', { name: 'Etiquetas' }))
    expect(await screen.findByText('Nenhuma etiqueta ativa')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos/equipment-1/etiquetas')
    clearAuthSession()
  })

  it('does not expose the labels section to a technician', async () => {
    setAuthSession('token', { id: 'tech-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
    render(<EquipmentDetailPage />, { wrapper: TestProviders })

    expect((await screen.findAllByRole('heading', { name: 'Bomba de infusão' })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('tab', { name: 'Etiquetas' })).not.toBeInTheDocument()
    expect(apiClient.get).not.toHaveBeenCalledWith('/equipamentos/equipment-1/etiquetas')
    clearAuthSession()
  })
})
