import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { HospitalForm } from '../components/HospitalForm'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

function renderForm(hospital?: { id: string; nome: string; cnpj: string; contratoNumero?: string | null }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><HospitalForm hospital={hospital} onClose={vi.fn()} onSaved={vi.fn()} /></QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'h1', nome: 'Hospital Central', cnpj: '12345678000190', contratoNumero: 'CT-2026/01' } } as never)
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'h2' } } as never)
  vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 'h1' } } as never)
})

describe('Número do contrato do hospital', () => {
  it('envia o contrato informado no cadastro', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('Nome do hospital'), 'Hospital Norte')
    await user.type(screen.getByLabelText('CNPJ'), '00000000000191')
    await user.type(screen.getByLabelText('Número do contrato (opcional)'), 'CT-9')
    await user.click(screen.getByRole('button', { name: 'Salvar hospital' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/hospitais', { nome: 'Hospital Norte', cnpj: '00000000000191', contratoNumero: 'CT-9' }))
  })

  it('mostra o contrato existente na edição e envia null ao limpar', async () => {
    const user = userEvent.setup()
    renderForm({ id: 'h1', nome: 'Hospital Central', cnpj: '12345678000190', contratoNumero: 'CT-2026/01' })
    const field = await screen.findByLabelText('Número do contrato (opcional)')
    await waitFor(() => expect(field).toHaveValue('CT-2026/01'))
    await user.clear(field)
    await user.click(screen.getByRole('button', { name: 'Salvar hospital' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/hospitais/h1', { nome: 'Hospital Central', cnpj: '12345678000190', contratoNumero: null }))
  })
})
