import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { ClientsPage } from '../pages/ClientsPage'

const { success } = vi.hoisted(() => ({ success: vi.fn() }))

vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) => <main><h1>{title}</h1><p>{subtitle}</p>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success } }))
vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><ClientsPage /></QueryClientProvider>)
}

const tenant = { id: 'tenant-1', nome: 'Grupo Hospitalar', cnpj: '12345678000190', ativo: true, createdAt: '2026-10-08T12:00:00Z' }

afterEach(() => {
  vi.resetAllMocks()
})

describe('ClientsPage', () => {
  it('lists tenants from the API without fabricating hospital counts or plans', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [tenant] } as never)
    renderPage()

    expect(await screen.findByText('Grupo Hospitalar')).toBeInTheDocument()
    expect(screen.getByText('12.345.678/0001-90')).toBeInTheDocument()
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contagem de hospitais não disponível')).toHaveTextContent('—')
    expect(screen.queryByText(/Enterprise|Plano/)).not.toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/tenants')
  })

  it('validates CNPJ inline and keeps the modal open', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] } as never)
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Novo cliente' }))
    await user.selectOptions(screen.getByLabelText('Tipo do cliente'), 'PJ')
    await user.type(screen.getByLabelText('Razão social'), 'Grupo')
    await user.type(screen.getByLabelText('CNPJ'), '123')
    await user.type(screen.getByLabelText('Nome do Admin do Cliente'), 'Clara Mendes')
    await user.type(screen.getByLabelText('Código do Admin'), 'ADM-001')
    await user.type(screen.getByLabelText('E-mail do Admin do Cliente'), 'clara@example.com')
    await user.click(screen.getByRole('button', { name: 'Criar cliente' }))

    expect(await screen.findByText('Informe um CNPJ com 14 dígitos.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('creates a tenant with normalized CNPJ, refreshes the list, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const createdTenant = { ...tenant, id: 'tenant-2', nome: 'Novo Hospitalar' }
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValueOnce({ data: [createdTenant] } as never)
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { tenantId: createdTenant.id } } as never)
    renderPage()
    const trigger = await screen.findByRole('button', { name: 'Novo cliente' })
    await user.click(trigger)
    await user.selectOptions(screen.getByLabelText('Tipo do cliente'), 'PF')
    await user.type(screen.getByLabelText('Razão social'), 'Novo Hospitalar')
    await user.type(screen.getByLabelText('CNPJ'), '12.345.678/0001-90')
    await user.type(screen.getByLabelText('Nome do Admin do Cliente'), 'Clara Mendes')
    await user.type(screen.getByLabelText('Código do Admin'), 'ADM-001')
    await user.type(screen.getByLabelText('E-mail do Admin do Cliente'), 'clara@example.com')
    await user.click(screen.getByRole('button', { name: 'Criar cliente' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/tenants', {
      tipo: 'PF', cnpj: '12345678000190', nome: 'Novo Hospitalar', adminNome: 'Clara Mendes', adminEmail: 'clara@example.com', adminCodigo: 'ADM-001',
    }))
    expect(await screen.findByText('Novo Hospitalar')).toBeInTheDocument()
    expect(success).toHaveBeenCalledWith('Cliente criado. O convite do Admin do Cliente foi enfileirado.')
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(apiClient.get).toHaveBeenCalledTimes(2)
  })

  it('shows backend duplicate-CNPJ details inline without closing the modal', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] } as never)
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { data: { code: 'CNPJ_DUPLICADO', detail: 'Já existe um cliente com este CNPJ.' } } })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Novo cliente' }))
    await user.selectOptions(screen.getByLabelText('Tipo do cliente'), 'PJ')
    await user.type(screen.getByLabelText('Razão social'), 'Grupo')
    await user.type(screen.getByLabelText('CNPJ'), '12345678000190')
    await user.type(screen.getByLabelText('Nome do Admin do Cliente'), 'Clara Mendes')
    await user.type(screen.getByLabelText('Código do Admin'), 'ADM-001')
    await user.type(screen.getByLabelText('E-mail do Admin do Cliente'), 'clara@example.com')
    await user.click(screen.getByRole('button', { name: 'Criar cliente' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um cliente com este CNPJ.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('offers an accessible retry when loading fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('offline'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os clientes.')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
