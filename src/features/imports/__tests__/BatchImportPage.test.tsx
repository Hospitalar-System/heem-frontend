import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { BatchImportPage } from '../pages/BatchImportPage'
import { createBatchImportTemplate, getBatchImportType } from '../types'

vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

function renderPage() {
  return render(<MemoryRouter initialEntries={['/imports']}><Routes>
    <Route path="/imports" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><BatchImportPage /></RequireRole>} />
    <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
  </Routes></MemoryRouter>)
}

describe('BatchImportPage', () => {
  beforeEach(() => {
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
  })

  afterEach(() => clearAuthSession())

  it('creates a header-only semicolon CSV template for each supported record type', () => {
    expect(createBatchImportTemplate('equipamentos')).toContain('setorId;codigo;nome')
    expect(createBatchImportTemplate('setores')).toContain('hospitalId;codigo;nome')
    expect(createBatchImportTemplate('usuarios')).toContain('codigo;nome;email;role')
    expect(getBatchImportType('usuarios').label).toBe('Usuários')
  })

  it('shows the chosen file but keeps processing blocked pending the backend API', async () => {
    const user = userEvent.setup()
    renderPage()
    const file = new File(['codigo;nome\nEQ-1;Monitor'], 'ativos.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('Selecionar arquivo CSV'), file)

    expect(await screen.findByText('ativos.csv')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar para processamento' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum arquivo será enviado')
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
