import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { transferErrorMessage } from '../api/movements'
import { EquipmentDetailPage } from '../pages/EquipmentDetailPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const equipment = {
  id: 'eq-1', codigo: 'EQ-1', nome: 'Bomba 01', setorId: 'sector-1', categoriaId: null, categoriaNome: null, modelo: null, numeroSerie: null, marca: null,
  fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'II', statusCicloVida: 'ATIVO', criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B',
  modoOperacao: 'CONTINUO', dataInstalacao: null, dataGarantiaFim: null, nivelRisco: 'BAIXO',
}
const movimentos = [
  { id: 'm2', movimentadoEm: '2026-11-04T13:30:00Z', setorOrigemId: 's-cc', setorOrigemNome: 'Centro Cirúrgico', hospitalOrigemId: 'hospital-1', hospitalOrigemNome: 'Santa Casa', setorDestinoId: 'sector-1', setorDestinoNome: 'UTI Adulto', hospitalDestinoId: 'hospital-1', hospitalDestinoNome: 'Santa Casa', movimentadoPor: 'u1', movimentadoPorNome: 'Rafael Costa', motivo: 'Leito novo', tipoMotivo: 'emprestimo' },
  { id: 'm1', movimentadoEm: '2026-09-18T10:00:00Z', setorOrigemId: 's-em', setorOrigemNome: 'Emergência', hospitalOrigemId: 'hospital-2', hospitalOrigemNome: 'Clínica Norte', setorDestinoId: 's-cc', setorDestinoNome: 'Centro Cirúrgico', hospitalDestinoId: 'hospital-1', hospitalDestinoNome: 'Santa Casa', movimentadoPor: 'u2', movimentadoPorNome: 'Clara Mendes', motivo: null, tipoMotivo: null },
]

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/assets/eq-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
    <Route path="/assets/:id" element={children} />
  </Routes></MemoryRouter></QueryClientProvider>
}

function setup(role: UserRole = 'admin_cliente') {
  clearAuthSession()
  setAuthSession('token', { id: 'user-1', name: 'Ana', roles: [role], tenantId: 'tenant-1' })
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/equipamentos/eq-1') return { data: equipment } as never
    if (url === '/setores/sector-1') return { data: { id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI Adulto' } } as never
    if (url === '/hospitais/hospital-1') return { data: { id: 'hospital-1', nome: 'Santa Casa' } } as never
    if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }, { id: 'hospital-2', nome: 'Clínica Norte', cnpj: '' }] } as never
    if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', nome: 'UTI Adulto' }, { id: 's-cc', hospitalId: 'hospital-1', nome: 'Centro Cirúrgico' }] } as never
    if (url === '/hospitais/hospital-2/setores') return { data: [{ id: 's-em', hospitalId: 'hospital-2', nome: 'Emergência' }] } as never
    if (url === '/equipamentos/eq-1/movimentacoes') return { data: movimentos, headers: { 'x-total-count': '2' } } as never
    return { data: [] } as never
  })
  vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'm3' } } as never)
  render(<EquipmentDetailPage />, { wrapper: Providers })
  return userEvent.setup()
}

const lastPost = () => vi.mocked(apiClient.post).mock.calls.at(-1) as [string, Record<string, string>]

describe('Transferir equipamento e Movimentações (Stories 24.1, 24.2 e 24.5)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valida destino, tipo e motivo; envia sem data (agora), com clientId, e avisa com toast', async () => {
    const user = setup()
    await user.click(await screen.findByRole('button', { name: 'Transferir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Transferir equipamento' })
    await user.click(within(dialog).getByRole('button', { name: 'Transferir' }))
    expect(within(dialog).getByText('Escolha o setor de destino.')).toBeInTheDocument()
    expect(within(dialog).getByText('Escolha o tipo do motivo.')).toBeInTheDocument()
    expect(within(dialog).getByText('Descreva o motivo da transferência.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('combobox', { name: 'Setor de destino' }))
    const opcoes = within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent)
    expect(opcoes).toEqual(['Centro Cirúrgico']) // o setor atual fica de fora
    await user.click(screen.getByRole('option', { name: 'Centro Cirúrgico' }))
    await chooseOption(user, 'Tipo do motivo', 'Empréstimo')
    await user.type(within(dialog).getByLabelText('Motivo'), '  Leito novo  ')
    await user.click(within(dialog).getByRole('button', { name: 'Transferir' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())
    const [url, body] = lastPost()
    expect(url).toBe('/equipamentos/eq-1/transferencias')
    expect(body).toMatchObject({ setorDestinoId: 's-cc', tipoMotivo: 'emprestimo', motivo: 'Leito novo' })
    expect(body.clientId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body).not.toHaveProperty('movimentadoEm')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Equipamento transferido para Centro Cirúrgico.'))
  })

  it('admin troca de hospital e vê os setores dele; erro do servidor aparece no diálogo', async () => {
    const user = setup()
    vi.mocked(apiClient.post).mockRejectedValue(Object.assign(new Error('x'), { response: { status: 400, data: { code: 'DATA_ANTERIOR_A_ULTIMA_MOVIMENTACAO' } } }))
    await user.click(await screen.findByRole('button', { name: 'Transferir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Transferir equipamento' })
    await chooseOption(user, 'Hospital de destino', 'Clínica Norte')
    await chooseOption(user, 'Setor de destino', 'Emergência')
    await chooseOption(user, 'Tipo do motivo', 'Remanejamento')
    await user.type(within(dialog).getByLabelText('Motivo'), 'Nova unidade')
    await user.click(within(dialog).getByRole('button', { name: 'Transferir' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('anterior à última movimentação')
    expect(lastPost()[1]).toMatchObject({ setorDestinoId: 's-em' })
  })

  it('técnico transfere só no mesmo hospital (sem o seletor de hospital); interno não vê o botão', async () => {
    const user = setup('tecnico')
    await user.click(await screen.findByRole('button', { name: 'Transferir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Transferir equipamento' })
    expect(within(dialog).queryByRole('combobox', { name: 'Hospital de destino' })).toBeNull()
    expect(within(dialog).getByText(/mesmo hospital/)).toBeInTheDocument()
  })

  it('interno do hospital não vê "Transferir", mas vê a aba Movimentações', async () => {
    const user = setup('interno_hospital')
    await screen.findByRole('heading', { name: 'Bomba 01', level: 2 })
    expect(screen.queryByRole('button', { name: 'Transferir' })).toBeNull()
    await user.click(screen.getByRole('tab', { name: 'Movimentações' }))
    expect(await screen.findByText('Leito novo')).toBeInTheDocument()
  })

  it('aba Movimentações: de/para (com hospital quando muda de hospital), tipo e "Não informado" sem tipo', async () => {
    const user = setup()
    await user.click(await screen.findByRole('tab', { name: 'Movimentações' }))
    const tabela = await screen.findByRole('table', { name: 'Movimentações' })
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(linhas[0]).toHaveTextContent('Empréstimo')
    expect(linhas[0]).toHaveTextContent('Centro Cirúrgico')
    expect(linhas[0]).not.toHaveTextContent('Santa Casa') // mesmo hospital: só o setor
    expect(linhas[1]).toHaveTextContent('Emergência · Clínica Norte')
    expect(linhas[1]).toHaveTextContent('Centro Cirúrgico · Santa Casa')
    expect(linhas[1]).toHaveTextContent('Não informado')
  })

  it('mensagens por código do servidor', () => {
    const erro = (code: string, status = 400) => ({ response: { status, data: { code } } })
    expect(transferErrorMessage(erro('SETOR_DESATIVADO', 409))).toMatch(/desativado/)
    expect(transferErrorMessage(erro('DESTINO_IGUAL_ORIGEM'))).toMatch(/já está nesse setor/)
    expect(transferErrorMessage(erro('DATA_ANTERIOR_AO_CADASTRO'))).toMatch(/cadastro/)
    expect(transferErrorMessage({ response: { status: 403, data: {} } })).toMatch(/mesmo hospital/)
  })
})
