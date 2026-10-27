import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { EquipmentDocumentsSection } from '../components/EquipmentDocumentsSection'
import { EquipmentDetailPage } from '../pages/EquipmentDetailPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('axios', () => ({ default: { put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const base = { equipamentoId: 'equipment-1', uploadedEm: '2026-10-01T10:00:00Z' }
const docs = [
  { ...base, id: 'd1', tipoDocumento: 'CERTIFICADO_CALIBRACAO', nomeArquivo: 'calibracao.pdf', validadeAte: '2026-09-01', vencido: true, vencendo: false },
  { ...base, id: 'd2', tipoDocumento: 'LAUDO_SEGURANCA', nomeArquivo: 'laudo.pdf', validadeAte: '2026-11-10', vencido: false, vencendo: true },
  { ...base, id: 'd3', tipoDocumento: 'NOTA_FISCAL', nomeArquivo: 'nota.pdf', validadeAte: '2027-12-31', vencido: false, vencendo: false },
  { ...base, id: 'd4', tipoDocumento: 'MANUAL', nomeArquivo: 'manual.pdf', validadeAte: null, vencido: false, vencendo: false },
]

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function renderSection(canWrite = true, canManage = true) {
  return render(<EquipmentDocumentsSection equipmentId="equipment-1" canWrite={canWrite} canManage={canManage} />, { wrapper: Providers })
}

describe('EquipmentDocumentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: docs } as never)
  })

  it('lists documents with textual Vencido, Vencendo, Válido and Sem validade badges', async () => {
    renderSection()
    const row = async (name: string) => (await screen.findByRole('row', { name: new RegExp(name) }))
    expect(within(await row('calibracao.pdf')).getByText('Vencido')).toBeInTheDocument()
    expect(within(await row('laudo.pdf')).getByText('Vencendo')).toBeInTheDocument()
    expect(within(await row('nota.pdf')).getByText('Válido')).toBeInTheDocument()
    expect(within(await row('manual.pdf')).getByText('Sem validade')).toBeInTheDocument()
    expect(within(await row('laudo.pdf')).getByText('10/11/2026')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos/equipment-1/documentos')
  })

  it('shows empty and error states', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] } as never)
    const { unmount } = renderSection()
    expect(await screen.findByText('Nenhum documento anexado')).toBeInTheDocument()
    unmount()
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('falha'))
    renderSection()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os documentos.')
  })

  it('uploads in three steps: upload-url, PUT to storage without Authorization, then registration', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockImplementation(async (url) => (url.endsWith('/upload-url')
      ? { data: { url: 'https://storage.test/signed?sig=1', chave: 'tenant/documentos/abc-manual.pdf', expiraEm: '2026-10-27T10:00:00Z' } }
      : { data: docs[3] }) as never)
    vi.mocked(axios.put).mockResolvedValue({ status: 200 } as never)
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Enviar documento' }))
    const file = new File(['conteudo'], 'manual novo.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Arquivo'), file)
    await chooseOption(user, 'Tipo do documento', 'Manual')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2))
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/equipamentos/equipment-1/documentos/upload-url', { nomeArquivo: 'manual novo.pdf' })
    expect(axios.put).toHaveBeenCalledWith('https://storage.test/signed?sig=1', file, expect.objectContaining({ headers: { 'Content-Type': 'application/pdf' } }))
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/equipamentos/equipment-1/documentos', {
      tipoDocumento: 'MANUAL', nomeArquivo: 'manual novo.pdf', chave: 'tenant/documentos/abc-manual.pdf', validadeAte: null,
    })
  })

  it('rejects oversized files on the client and requires a type, without any request', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Enviar documento' }))
    const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 })
    fireEvent.change(screen.getByLabelText('Arquivo'), { target: { files: [big] } })
    expect(await screen.findByText('O arquivo excede o limite de 20 MB.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Escolha o tipo do documento.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
    expect(axios.put).not.toHaveBeenCalled()
  })

  it('shows the storage error, keeps the modal open and does not register the document', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({ data: { url: 'https://storage.test/signed', chave: 'k', expiraEm: null } } as never)
    vi.mocked(axios.put).mockRejectedValue(new Error('rede'))
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Enviar documento' }))
    await user.upload(screen.getByLabelText('Arquivo'), new File(['a'], 'a.pdf', { type: 'application/pdf' }))
    await chooseOption(user, 'Tipo do documento', 'Outro')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Não foi possível enviar o documento. Tente novamente.')).toBeInTheDocument()
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('edits the validity through PATCH and can clear it', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.patch).mockResolvedValue({ data: docs[0] } as never)
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Editar validade de nota.pdf' }))
    await user.click(screen.getByRole('button', { name: 'Salvar validade' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/equipamentos/equipment-1/documentos/d3/validade', { validadeAte: '2027-12-31' }))
  })

  it('asks for confirmation before deleting', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 } as never)
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Excluir laudo.pdf' }))
    expect(apiClient.delete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/equipamentos/equipment-1/documentos/d2'))
  })

  it('opens the pre-signed download URL in a new tab with noopener', async () => {
    const user = userEvent.setup()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: url.endsWith('/download-url') ? { url: 'https://storage.test/get?sig=2', chave: 'k', expiraEm: null } : docs }) as never)
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Baixar manual.pdf' }))
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://storage.test/get?sig=2', '_blank', 'noopener,noreferrer'))
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos/equipment-1/documentos/d4/download-url')
    open.mockRestore()
  })

  it('hides write actions for read-only and admin-only controls for technicians', async () => {
    const { unmount } = renderSection(false, false)
    await screen.findByText('manual.pdf')
    expect(screen.queryByRole('button', { name: 'Enviar documento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar validade/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Excluir/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar manual.pdf' })).toBeInTheDocument()
    unmount()
    renderSection(true, false)
    expect(await screen.findByRole('button', { name: 'Enviar documento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar validade/ })).not.toBeInTheDocument()
  })
})

describe('EquipmentDetailPage documents tab access', () => {
  function PageProviders({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/assets/equipment-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets/:id" element={children} /></Routes></MemoryRouter></QueryClientProvider>
  }
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/equipamentos/equipment-1') return { data: { id: 'equipment-1', setorId: 's', codigo: 'EQ', nome: 'Bomba', fotoUrl: null, dadosGerais: {}, statusCicloVida: 'ATIVO' } } as never
      return { data: [] } as never
    })
  })

  it.each([['admin_cliente', true], ['tecnico', true], ['interno_hospital', false]])('%s sees the Documentos tab: %s', async (role, visible) => {
    setAuthSession('token', { id: 'u1', name: 'U', roles: [role as 'tecnico'], tenantId: 't' })
    render(<EquipmentDetailPage />, { wrapper: PageProviders })
    await screen.findByRole('tab', { name: 'Dados' })
    expect(Boolean(screen.queryByRole('tab', { name: 'Documentos' }))).toBe(visible)
    clearAuthSession()
  })

  it('loads documents when the tab is opened', async () => {
    const user = userEvent.setup()
    setAuthSession('token', { id: 'u1', name: 'U', roles: ['tecnico'], tenantId: 't' })
    render(<EquipmentDetailPage />, { wrapper: PageProviders })
    await user.click(await screen.findByRole('tab', { name: 'Documentos' }))
    expect(await screen.findByText('Nenhum documento anexado')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos/equipment-1/documentos')
    clearAuthSession()
  })
})
