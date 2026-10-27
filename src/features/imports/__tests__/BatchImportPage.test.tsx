import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { BatchImportPage } from '../pages/BatchImportPage'
import { createBatchImportTemplate, describeBatchImportError, getBatchImportType } from '../types'

vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/imports']}><Routes>
    <Route path="/imports" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><BatchImportPage /></RequireRole>} />
    <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
  </Routes></MemoryRouter></QueryClientProvider>)
}

describe('BatchImportPage', () => {
  beforeEach(() => {
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
  })

  afterEach(() => clearAuthSession())

  it('creates a header-only semicolon CSV template for each supported record type', () => {
    // Cabeçalhos do contrato da Story 11.1 (snake_case sem acento): camelCase seria rejeitado com CABECALHO_INVALIDO.
    expect(createBatchImportTemplate('equipamentos')).toContain('setor;codigo;nome')
    expect(createBatchImportTemplate('equipamentos')).not.toContain('setorId')
    expect(createBatchImportTemplate('setores')).toContain('hospital;codigo;nome')
    expect(createBatchImportTemplate('usuarios')).toContain('codigo;nome;email;papel')
    expect(getBatchImportType('usuarios').label).toBe('Usuários')
  })

  it('requires the categoria column in the equipment template, with the CSV text it downloads', async () => {
    expect(createBatchImportTemplate('equipamentos')).toContain('nome;categoria;modelo')
    expect(createBatchImportTemplate('setores')).not.toContain('categoria')
    const blobs: Blob[] = []
    const NativeURL = globalThis.URL
    vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL: (blob: Blob) => { blobs.push(blob); return 'blob:modelo' }, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    renderPage()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Baixar modelo' }))
    expect(await blobs[0].text()).toContain(';categoria;')
    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('explains the mandatory categoria column and the row errors for the equipment import', () => {
    renderPage()
    expect(screen.getByText(/A coluna categoria é obrigatória/)).toBeInTheDocument()
    expect(screen.getByText('CABECALHO_INVALIDO')).toBeInTheDocument()
    expect(screen.getByText('CATEGORIA_NAO_ENCONTRADA')).toBeInTheDocument()
    expect(describeBatchImportError('CATEGORIA_NAO_ENCONTRADA')).toMatch(/Categoria não encontrada ou desativada/)
    expect(describeBatchImportError('CABECALHO_INVALIDO')).toMatch(/coluna categoria é obrigatória/)
    expect(describeBatchImportError('OUTRO')).toBe('OUTRO')
  })

  it('shows the chosen file and enables the send button only after a valid file is chosen', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByRole('button', { name: 'Enviar para processamento' })).toBeDisabled()
    const file = new File(['codigo;nome\nEQ-1;Monitor'], 'ativos.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('Selecionar arquivo CSV'), file)

    expect(await screen.findByText('ativos.csv')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar para processamento' })).toBeEnabled()
    expect(screen.queryByText(/Nenhum arquivo será enviado/)).not.toBeInTheDocument()
  })

  it('rejects non-CSV files and explains the accepted extension', () => {
    renderPage()
    const file = new File(['not csv'], 'ativos.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    fireEvent.change(screen.getByLabelText('Selecionar arquivo CSV'), { target: { files: [file] } })

    expect(screen.getByRole('alert')).toHaveTextContent('Selecione um arquivo com extensão .csv.')
    expect(screen.queryByText('ativos.xlsx')).not.toBeInTheDocument()
  })

  it('denies other roles before rendering the import screen', () => {
    setAuthSession('token', { id: 'tech-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Importação em lote' })).not.toBeInTheDocument()
  })

  it('downloads the currently selected template', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:template')
    const revokeObjectURL = vi.fn()
    const NativeURL = globalThis.URL
    const MockedURL = Object.assign(class extends NativeURL {}, { createObjectURL, revokeObjectURL })
    vi.stubGlobal('URL', MockedURL)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Baixar modelo' }))
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:template')
    click.mockRestore()
    vi.unstubAllGlobals()
  })
})
