import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'
import { apiClient } from '@/lib/axios'
import { prepareImage } from '@/lib/image-resize'
import { EquipmentPhotoSection } from '../components/EquipmentPhotoSection'
import { EquipmentDetailPage } from '../pages/EquipmentDetailPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('axios', () => ({ default: { put: vi.fn() } }))
vi.mock('@/lib/image-resize', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/image-resize')>()), prepareImage: vi.fn() }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const original = new Blob(['o'], { type: 'image/jpeg' })
const miniatura = new Blob(['m'], { type: 'image/jpeg' })
const signed = {
  original: { url: 'https://storage.invalid/o', chave: 'k/original', expiraEm: '2026-10-01T10:15:00Z', contentType: 'image/jpeg' },
  miniatura: { url: 'https://storage.invalid/m', chave: 'k/mini', expiraEm: '2026-10-01T10:15:00Z', contentType: 'image/jpeg' },
}

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function renderSection(props: Partial<Parameters<typeof EquipmentPhotoSection>[0]> = {}) {
  return render(<EquipmentPhotoSection equipmentId="equipment-1" nome="Bomba" fotoVersao="2026-10-01T10:00:00Z" hasLegacyPhoto={false} canWrite canDelete {...props} />, { wrapper: Providers })
}

const jpeg = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

describe('EquipmentPhotoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prepareImage).mockResolvedValue({ original, miniatura, tipo: 'image/jpeg' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: { url: String(url).endsWith('miniatura') ? 'https://img/mini.jpg' : 'https://img/full.jpg' } }) as never)
    vi.mocked(apiClient.post).mockResolvedValue({ data: signed } as never)
    vi.mocked(apiClient.put).mockResolvedValue({ data: { fotoVersao: '2026-10-02T10:00:00Z' } } as never)
    vi.mocked(apiClient.delete).mockResolvedValue({ data: null } as never)
    vi.mocked(axios.put).mockResolvedValue({} as never)
  })

  it('uploads through signed URLs with the same Content-Type and no Authorization, then confirms the keys', async () => {
    renderSection({ fotoVersao: null })
    expect(screen.getByText('Nenhuma foto cadastrada.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Selecionar arquivo da foto'), { target: { files: [jpeg()] } })
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/equipamentos/equipment-1/foto', { chaveOriginal: 'k/original', chaveMiniatura: 'k/mini' }))
    expect(apiClient.post).toHaveBeenCalledWith('/equipamentos/equipment-1/foto/upload-url', { tipoOriginal: 'image/jpeg', tipoMiniatura: 'image/jpeg' })
    expect(axios.put).toHaveBeenCalledWith('https://storage.invalid/o', original, { headers: { 'Content-Type': 'image/jpeg' } })
    expect(axios.put).toHaveBeenCalledWith('https://storage.invalid/m', miniatura, { headers: { 'Content-Type': 'image/jpeg' } })
    for (const call of vi.mocked(axios.put).mock.calls) expect(JSON.stringify(call[2])).not.toMatch(/authorization/i)
    // o PUT de confirmação só acontece depois dos dois envios ao storage
    expect(vi.mocked(axios.put).mock.invocationCallOrder[1]).toBeLessThan(vi.mocked(apiClient.put).mock.invocationCallOrder[0])
  })

  it('shows Trocar foto when a photo exists and refetches the thumbnail after a replacement', async () => {
    renderSection()
    expect(await screen.findByAltText('Foto de Bomba')).toHaveAttribute('src', 'https://img/mini.jpg')
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos/equipment-1/foto/miniatura')
    const callsBefore = vi.mocked(apiClient.get).mock.calls.length
    fireEvent.change(screen.getByLabelText('Selecionar arquivo da foto'), { target: { files: [jpeg()] } })
    await waitFor(() => expect(apiClient.put).toHaveBeenCalled())
    await waitFor(() => expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(callsBefore))
    expect(screen.getByRole('button', { name: 'Trocar foto' })).toBeInTheDocument()
  })

  it('opens the original in an accessible dialog', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Ampliar foto de Bomba' }))
    expect(await screen.findByRole('dialog', { name: 'Foto de Bomba' })).toBeInTheDocument()
    expect(await screen.findByAltText('Foto de Bomba ampliada')).toHaveAttribute('src', 'https://img/full.jpg')
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos/equipment-1/foto')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('removes the photo only after confirmation (admin)', async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Remover foto' }))
    expect(apiClient.delete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/equipamentos/equipment-1/foto'))
  })

  it('maps FOTO_INVALIDA to a pt-BR message', async () => {
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { status: 400, data: { code: 'FOTO_INVALIDA' } } })
    renderSection({ fotoVersao: null })
    fireEvent.change(screen.getByLabelText('Selecionar arquivo da foto'), { target: { files: [jpeg()] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('A foto não foi aceita')
  })

  it('rejects an unsupported file before any request', async () => {
    renderSection({ fotoVersao: null })
    fireEvent.change(screen.getByLabelText('Selecionar arquivo da foto'), { target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Formato não suportado')
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('gives technicians upload but no remove, and interno_hospital read-only', () => {
    const { unmount } = renderSection({ canDelete: false })
    expect(screen.getByRole('button', { name: 'Trocar foto' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument()
    unmount()
    renderSection({ canWrite: false, canDelete: false })
    expect(screen.queryByRole('button', { name: 'Trocar foto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar foto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeInTheDocument()
  })

  it('does not request any photo URL when the equipment has no photo', () => {
    renderSection({ fotoVersao: null, canWrite: false, canDelete: false })
    expect(screen.getByText('Nenhuma foto cadastrada.')).toBeInTheDocument()
    expect(apiClient.get).not.toHaveBeenCalled()
  })
})

describe('EquipmentDetailPage photo permissions', () => {
  const equipment = {
    id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-001', nome: 'Bomba de infusão', modelo: null, numeroSerie: null,
    marca: null, fotoUrl: null, fotoVersao: '2026-10-01T10:00:00Z', dadosGerais: {}, classeRiscoAnvisa: 'II', statusCicloVida: 'ATIVO',
    criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: null,
    dataGarantiaFim: null, nivelRisco: 'BAIXO',
  }
  function Page({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/assets/equipment-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets/:id" element={children} /></Routes></MemoryRouter></QueryClientProvider>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/equipamentos/equipment-1') return { data: equipment } as never
      if (String(url).includes('/foto')) return { data: { url: 'https://img/x.jpg' } } as never
      return { data: [] } as never
    })
  })

  it.each([
    ['admin_cliente', true, true],
    ['tecnico', true, false],
    ['interno_hospital', false, false],
  ] as Array<[UserRole, boolean, boolean]>)('%s: upload=%s remove=%s', async (role, canUpload, canRemove) => {
    setAuthSession('token', { id: 'u1', name: 'U', roles: [role], tenantId: 'tenant-1' })
    render(<EquipmentDetailPage />, { wrapper: Page })
    expect(await screen.findByAltText('Foto de Bomba de infusão')).toBeInTheDocument()
    expect(!!screen.queryByRole('button', { name: 'Trocar foto' })).toBe(canUpload)
    expect(!!screen.queryByRole('button', { name: 'Remover foto' })).toBe(canRemove)
    clearAuthSession()
  })
})
