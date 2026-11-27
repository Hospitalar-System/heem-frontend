import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'
import { apiClient } from '@/lib/axios'
import { QualityWindowPage } from '../pages/QualityWindowPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

const defaults = { janelaQualidadeAnaliseDias: 30, padrao: true, atualizadoEm: null, atualizadoPor: null }

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function setup(role: UserRole = 'admin_cliente', config: object = defaults) {
  clearAuthSession()
  setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: [role], tenantId: 'tenant-1' })
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/configuracao-cliente') return { data: config } as never
    if (url === '/users') return { data: [{ id: 'admin-1', codigo: 'A', nome: 'Clara Mendes', email: 'c@x', role: 'admin_cliente', ativo: true }] } as never
    return { data: [] } as never
  })
  render(<Providers><MemoryRouter initialEntries={['/settings/quality-analysis']}><Routes>
    <Route path="/settings/quality-analysis" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><QualityWindowPage /></RequireRole>} />
    <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
  </Routes></MemoryRouter></Providers>)
  return userEvent.setup()
}

describe('QualityWindowPage (Story 23.2)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra o padrão de 30 dias e salva um valor novo', async () => {
    const user = setup()
    vi.mocked(apiClient.put).mockResolvedValue({ data: { janelaQualidadeAnaliseDias: 45, padrao: false, atualizadoEm: '2026-11-26T15:00:00Z', atualizadoPor: 'admin-1' } } as never)
    const input = await screen.findByLabelText('Janela (dias)')
    expect(input).toHaveValue(30)
    expect(screen.getByText('Padrão do sistema')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar janela' })).toBeDisabled()
    await user.clear(input)
    await user.type(input, '45')
    await user.click(screen.getByRole('button', { name: 'Salvar janela' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/configuracao-cliente', { janelaQualidadeAnaliseDias: 45 }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Janela salva. Vale para os próximos cálculos.'))
    expect(screen.getByText('Personalizado')).toBeInTheDocument()
    expect(await screen.findByText(/por Clara Mendes/)).toBeInTheDocument()
  })

  it.each([['6'], ['366'], ['10.5'], ['']])('valor inválido (%s) bloqueia o envio e mostra a faixa', async (value) => {
    const user = setup()
    const input = await screen.findByLabelText('Janela (dias)')
    await user.clear(input)
    if (value) await user.type(input, value)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Informe um número inteiro entre 7 e 365.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar janela' })).toBeDisabled()
  })

  it('mostra JANELA_INVALIDA do servidor em pt-BR', async () => {
    const user = setup()
    vi.mocked(apiClient.put).mockRejectedValue(Object.assign(new Error('x'), { response: { status: 400, data: { code: 'JANELA_INVALIDA' } } }))
    const input = await screen.findByLabelText('Janela (dias)')
    await user.clear(input)
    await user.type(input, '20')
    await user.click(screen.getByRole('button', { name: 'Salvar janela' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('entre 7 e 365 dias')
    // o campo fica invalido (borda danger) e aponta para a mensagem do servidor
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toContain(alerta.id)
    expect(input).toHaveClass('border-danger')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it.each([['tecnico'], ['interno_hospital']] as [UserRole][])('%s não acessa', async (role) => {
    setup(role)
    expect(await screen.findByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    expect(apiClient.get).not.toHaveBeenCalledWith('/configuracao-cliente')
  })
})
