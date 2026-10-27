import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { useState, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { prepareImage } from '@/lib/image-resize'
import { WorkOrderPhotosSection } from '../components/WorkOrderPhotosSection'
import { canEditWorkOrderPhotos } from '../api/work-order-photos'
import type { WorkOrderDetail } from '../types'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
vi.mock('axios', () => ({ default: { put: vi.fn() } }))
vi.mock('@/lib/image-resize', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/image-resize')>()), prepareImage: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const order: WorkOrderDetail = {
  id: 'order-1', codigo: 'OT-2041', tipo: 'PREVENTIVA', status: 'EM_EXECUCAO', equipamentoId: 'e1', checklistId: null,
  tecnicoId: 'tech-1', local: null, dataAgendada: null, iniciadaEm: null, concluidaEm: null,
}
const admin = { id: 'admin-1', roles: ['admin_cliente'] }
const tech = { id: 'tech-1', roles: ['tecnico'] }
const photo = (n: number) => ({ id: `p${n}`, criadoEm: '2026-10-01T10:00:00Z', urlOriginal: `https://img/o${n}.jpg`, urlMiniatura: `https://img/m${n}.jpg` })
const signed = {
  original: { url: 'https://storage.invalid/o', chave: 'k/o', expiraEm: 'x', contentType: 'image/jpeg' },
  miniatura: { url: 'https://storage.invalid/m', chave: 'k/m', expiraEm: 'x', contentType: 'image/jpeg' },
}

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
const renderSection = (o: Partial<WorkOrderDetail> = {}, user: { id: string; roles: string[] } = admin) =>
  render(<WorkOrderPhotosSection order={{ ...order, ...o }} user={user} />, { wrapper: Providers })
const jpeg = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

describe('WorkOrderPhotosSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: [photo(1), photo(2)] } as never)
    vi.mocked(apiClient.post).mockImplementation(async (url) => (String(url).endsWith('upload-url') ? { data: signed } : { data: { id: 'p9', criadoEm: 'x' } }) as never)
    vi.mocked(apiClient.delete).mockResolvedValue({ data: null } as never)
    vi.mocked(axios.put).mockResolvedValue({} as never)
    vi.mocked(prepareImage).mockResolvedValue({ original: new Blob(['o']), miniatura: new Blob(['m']), tipo: 'image/jpeg' })
  })

  it('shows the gallery with counter and opens the original in a dialog', async () => {
    const user = userEvent.setup()
    renderSection()
    expect(await screen.findByAltText('Foto 1 da OT OT-2041')).toHaveAttribute('src', 'https://img/m1.jpg')
    expect(screen.getByText('2/5')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/ordens-de-trabalho/order-1/fotos')
    await user.click(screen.getByRole('button', { name: 'Abrir foto 2' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByAltText('Foto ampliada da OT OT-2041')).toHaveAttribute('src', 'https://img/o2.jpg')
  })

  it('shows the empty state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] } as never)
    renderSection()
    expect(await screen.findByText('Nenhuma foto anexada a esta OT.')).toBeInTheDocument()
    expect(screen.getByText('0/5')).toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('falha'))
    renderSection()
    expect(await screen.findByText(/Não foi possível carregar as fotos/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByAltText('Foto 1 da OT OT-2041')).toBeInTheDocument()
  })

  it('attaches a photo via signed URLs and confirms with the keys', async () => {
    renderSection()
    await screen.findByAltText('Foto 1 da OT OT-2041')
    fireEvent.change(screen.getByLabelText('Selecionar arquivo da foto'), { target: { files: [jpeg()] } })
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/ordens-de-trabalho/order-1/fotos', { chaveOriginal: 'k/o', chaveMiniatura: 'k/m' }))
    expect(apiClient.post).toHaveBeenCalledWith('/ordens-de-trabalho/order-1/fotos/upload-url', { tipoOriginal: 'image/jpeg', tipoMiniatura: 'image/jpeg' })
    expect(axios.put).toHaveBeenCalledWith('https://storage.invalid/o', expect.any(Blob), { headers: { 'Content-Type': 'image/jpeg' } })
    for (const call of vi.mocked(axios.put).mock.calls) expect(JSON.stringify(call[2])).not.toMatch(/authorization/i)
  })

  it('disables attaching at the 5-photo limit', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [1, 2, 3, 4, 5].map(photo) } as never)
    renderSection()
    expect(await screen.findByText('5/5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anexar foto' })).toBeDisabled()
    expect(screen.getByText(/Limite de 5 fotos atingido/)).toBeInTheDocument()
  })

  it.each([
    ['LIMITE_FOTOS_OT', 'já tem 5 fotos'],
    ['OT_NAO_PREVENTIVA', 'Somente OTs preventivas'],
    ['OT_STATUS_NAO_PERMITE_FOTO', 'em execução ou concluída'],
    ['FOTO_INVALIDA', 'não foi aceita'],
  ])('maps %s to pt-BR', async (code, text) => {
    vi.mocked(apiClient.post).mockImplementation(async (url) => {
      if (String(url).endsWith('upload-url')) return { data: signed } as never
      throw { response: { status: code === 'FOTO_INVALIDA' ? 400 : 409, data: { code } } }
    })
    renderSection()
    await screen.findByAltText('Foto 1 da OT OT-2041')
    fireEvent.change(screen.getByLabelText('Selecionar arquivo da foto'), { target: { files: [jpeg()] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
  })

  it('removes a photo after confirmation', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Remover foto 1' }))
    expect(apiClient.delete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/ordens-de-trabalho/order-1/fotos/p1'))
  })

  it('is read-only for interno_hospital and scheduled/cancelled orders', async () => {
    const view = renderSection({}, { id: 'i1', roles: ['interno_hospital'] })
    await screen.findByAltText('Foto 1 da OT OT-2041')
    expect(screen.queryByRole('button', { name: 'Anexar foto' })).not.toBeInTheDocument()
    view.unmount()
    renderSection({ status: 'AGENDADA' })
    await screen.findByAltText('Foto 1 da OT OT-2041')
    expect(screen.queryByRole('button', { name: 'Anexar foto' })).not.toBeInTheDocument()
  })

  it('shows actions to a technician even when the session id differs from tecnicoId (backend decides)', async () => {
    renderSection({}, { id: 'keycloak-sub', roles: ['tecnico'] })
    expect(await screen.findByRole('button', { name: 'Anexar foto' })).toBeEnabled()
    expect(await screen.findByRole('button', { name: 'Remover foto 1' })).toBeInTheDocument()
  })

  it('maps 404 on attach and remove to the not-responsible message', async () => {
    const user = userEvent.setup()
    const message = 'Somente o técnico responsável pela OT ou o administrador pode alterar as fotos.'
    vi.mocked(apiClient.post).mockRejectedValue({ response: { status: 404, data: {} } })
    vi.mocked(apiClient.delete).mockRejectedValue({ response: { status: 404, data: {} } })
    renderSection({}, { id: 'keycloak-sub', roles: ['tecnico'] })
    await screen.findByAltText('Foto 1 da OT OT-2041')
    fireEvent.change(screen.getByLabelText('Selecionar arquivo da foto'), { target: { files: [jpeg()] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    await user.click(screen.getByRole('button', { name: 'Remover foto 1' }))
    await user.click(screen.getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })
})

describe('canEditWorkOrderPhotos', () => {
  it('requires preventive type, em_execucao/concluida status and technician or admin role', () => {
    expect(canEditWorkOrderPhotos(order, admin)).toBe(true)
    expect(canEditWorkOrderPhotos({ ...order, status: 'CONCLUIDA' }, tech)).toBe(true)
    expect(canEditWorkOrderPhotos({ ...order, tipo: 'CORRETIVA' }, admin)).toBe(false)
    expect(canEditWorkOrderPhotos({ ...order, status: 'AGENDADA' }, admin)).toBe(false)
    expect(canEditWorkOrderPhotos({ ...order, status: 'CANCELADA' }, admin)).toBe(false)
    expect(canEditWorkOrderPhotos(order, { roles: ['tecnico'] })).toBe(true)
    expect(canEditWorkOrderPhotos(order, { roles: ['interno_hospital'] })).toBe(false)
    expect(canEditWorkOrderPhotos(order, null)).toBe(false)
  })
})
