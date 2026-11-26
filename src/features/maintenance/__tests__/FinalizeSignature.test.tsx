import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { forwardRef, useImperativeHandle, useState, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { CampaignFinalizationSection } from '../components/CampaignFinalization'
import { FinalizeSignatureModal } from '../components/FinalizeSignatureModal'
import { SignaturesSection } from '../components/SignaturesSection'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('axios', () => ({ default: { put: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// O jsdom não desenha em canvas: a área de assinatura vira um botão "Desenhar" que devolve um PNG de teste.
let blobSize = 10
vi.mock('../components/SignatureCanvas', () => ({
  SignatureCanvas: forwardRef<unknown, { label: string; onChange?: (empty: boolean) => void }>(function FakeCanvas({ label, onChange }, ref) {
    const [drawn, setDrawn] = useState(false)
    useImperativeHandle(ref, () => ({
      isEmpty: () => !drawn,
      clear: () => setDrawn(false),
      toBlob: async () => (drawn ? new Blob([new Uint8Array(blobSize)], { type: 'image/png' }) : null),
    }))
    return <button type="button" onClick={() => { setDrawn(true); onChange?.(false) }}>Desenhar {label}</button>
  }),
}))

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const upload = { url: 'https://storage.invalid/assinatura', chave: 'tenant/assinaturas/a.png', expiraEm: 'x' }
const posts = () => vi.mocked(apiClient.post).mock.calls.filter(([url]) => url === '/assinaturas').map(([, body]) => body as Record<string, unknown>)

describe('FinalizeSignatureModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    blobSize = 10
    vi.mocked(apiClient.post).mockImplementation(async (url) => (url === '/assinaturas/upload-url' ? { data: upload } : { data: { id: 's1' } }) as never)
    vi.mocked(axios.put).mockResolvedValue({} as never)
  })

  it('requires the technician signature and then offers the optional hospital responsible signature', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FinalizeSignatureModal target={{ tipo: 'chamado', id: 'ch-1' }} title="Finalizar chamado" description="CH-0042" onClose={onClose} />, { wrapper: Providers })

    const register = screen.getByRole('button', { name: 'Registrar assinatura' })
    expect(register).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Desenhar Assinatura do técnico' }))
    await user.click(register)

    await screen.findByLabelText('Nome do responsável')
    expect(axios.put).toHaveBeenCalledWith(upload.url, expect.any(Blob), { headers: { 'Content-Type': 'image/png' } })
    expect(posts()[0]).toMatchObject({ alvoTipo: 'chamado', alvoId: 'ch-1', papel: 'tecnico', chaveArquivo: upload.chave })
    expect(posts()[0]).not.toHaveProperty('nome')

    await user.type(screen.getByLabelText('Nome do responsável'), 'Carla Gestora')
    await user.type(screen.getByLabelText('Cargo'), 'Coordenadora de enfermagem')
    await user.click(screen.getByRole('button', { name: 'Desenhar Assinatura do responsável' }))
    await user.click(screen.getByRole('button', { name: 'Registrar assinatura' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(posts()[1]).toMatchObject({ papel: 'responsavel_hospital', nome: 'Carla Gestora', cargo: 'Coordenadora de enfermagem' })
    expect(posts()[1].clientId).not.toBe(posts()[0].clientId)
  })

  it('opens on the responsible step when the technician already signed, and skipping closes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<FinalizeSignatureModal target={{ tipo: 'ot', id: 'ot-1' }} title="Finalizar OT" description="OT-1" technicianSigned onClose={onClose} />, { wrapper: Providers })
    expect(screen.getByLabelText('Nome do responsável')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pular' }))
    expect(onClose).toHaveBeenCalled()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('shows the server error and retries with the same clientId', async () => {
    const user = userEvent.setup()
    let fail = true
    vi.mocked(apiClient.post).mockImplementation(async (url) => {
      if (url === '/assinaturas/upload-url') return { data: upload } as never
      if (fail) { fail = false; throw Object.assign(new Error('409'), { response: { status: 409, data: { code: 'ALVO_NAO_FINALIZADO' } } }) }
      return { data: { id: 's1' } } as never
    })
    render(<FinalizeSignatureModal target={{ tipo: 'ot', id: 'ot-1' }} title="Finalizar OT" description="OT-1" onClose={vi.fn()} />, { wrapper: Providers })
    await user.click(screen.getByRole('button', { name: 'Desenhar Assinatura do técnico' }))
    await user.click(screen.getByRole('button', { name: 'Registrar assinatura' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Só é possível assinar depois de concluir a OT ou resolver o chamado.')
    await user.click(screen.getByRole('button', { name: 'Registrar assinatura' }))
    await screen.findByLabelText('Nome do responsável')
    expect(posts()[1].clientId).toBe(posts()[0].clientId)
  })

  it('refuses an image above 200 KB without calling the API', async () => {
    const user = userEvent.setup()
    blobSize = 200 * 1024 + 1
    render(<FinalizeSignatureModal target={{ tipo: 'ot', id: 'ot-1' }} title="Finalizar OT" description="OT-1" onClose={vi.fn()} />, { wrapper: Providers })
    await user.click(screen.getByRole('button', { name: 'Desenhar Assinatura do técnico' }))
    await user.click(screen.getByRole('button', { name: 'Registrar assinatura' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('grande demais')
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})

describe('SignaturesSection', () => {
  it('shows image, role, name, CREA or role in the hospital and the empty state', () => {
    const { rerender } = render(<SignaturesSection emptyText="Sem assinatura." signatures={[
      { id: 'a', papel: 'tecnico', nome: 'Ana Técnica', registroProfissional: '123456/SP', cargo: null, assinadoEm: '2026-11-26T13:00:00Z', registradoEm: 'x', urlImagem: 'https://img/a.png' },
      { id: 'b', papel: 'responsavel_hospital', nome: 'Carla Gestora', registroProfissional: null, cargo: 'Coordenadora', assinadoEm: '2026-11-26T13:05:00Z', registradoEm: 'x', urlImagem: 'https://img/b.png' },
    ]} />)
    expect(screen.getByAltText('Assinatura de Ana Técnica')).toHaveAttribute('src', 'https://img/a.png')
    expect(screen.getByText(/CREA 123456\/SP/)).toBeInTheDocument()
    expect(screen.getByText('Responsável do hospital')).toBeInTheDocument()
    expect(screen.getByText(/Coordenadora ·/)).toBeInTheDocument()
    rerender(<SignaturesSection emptyText="Sem assinatura." signatures={null} />)
    expect(screen.getByText('Sem assinatura.')).toBeInTheDocument()
  })
})

describe('CampaignFinalizationSection (web, só leitura)', () => {
  const summary = { totalOts: 3, aptos: 1, naoAptos: 1, emManutencao: 1, semVeredito: 0, ots: [
    { id: 'o1', codigo: 'OT-101', equipamentoId: 'e', concluidaEm: 'x', veredito: 'ATIVO' },
    { id: 'o2', codigo: 'OT-102', equipamentoId: 'e', concluidaEm: 'x', veredito: 'NAO_APTO' },
    { id: 'o3', codigo: 'OT-103', equipamentoId: 'e', concluidaEm: 'x', veredito: 'EM_MANUTENCAO' },
  ] }

  beforeEach(() => { vi.clearAllMocks() })

  it('lists the finalizations with the technician name, covered OTs and verdicts, with no action', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'fin-1', campanhaId: 'c1', tecnicoId: 't1', clientId: 'x', finalizadoEm: '2026-11-26T13:00:00Z', resumo: summary }] } as never)
    render(<CampaignFinalizationSection campaignId="c1" technicianNames={{ t1: 'Ana Técnica' }} />, { wrapper: Providers })
    expect(await screen.findByText('Ana Técnica')).toBeInTheDocument()
    expect(screen.getByText('OT-103')).toBeInTheDocument()
    expect(screen.getByText('3 OTs · 1 aptos · 1 não aptos · 1 em manutenção')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/campanhas-preventivas/c1/finalizacoes')
  })

  it('shows at most 5 covered OT codes followed by "e mais N"', async () => {
    const ots = Array.from({ length: 8 }, (_, index) => ({ id: `o${index}`, codigo: `OT-${200 + index}`, equipamentoId: 'e', concluidaEm: 'x', veredito: 'ATIVO' }))
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'fin-1', campanhaId: 'c1', tecnicoId: 't1', clientId: 'x', finalizadoEm: '2026-11-26T13:00:00Z', resumo: { ...summary, totalOts: 8, ots } }] } as never)
    render(<CampaignFinalizationSection campaignId="c1" />, { wrapper: Providers })
    expect(await screen.findByText('OT-204,')).toBeInTheDocument()
    expect(screen.queryByText(/OT-205/)).not.toBeInTheDocument()
    expect(screen.getByText('e mais 3')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] } as never)
    render(<CampaignFinalizationSection campaignId="c1" />, { wrapper: Providers })
    expect(await screen.findByText('Nenhuma finalização registrada ainda.')).toBeInTheDocument()
  })
})
