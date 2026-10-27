import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { UsersPage } from '../pages/UsersPage'
import type { TenantUser } from '../types'
import { chooseOption, listOptions } from '@/test/select-helpers'
import { chooseRowAction, confirmRowAction, listRowActions } from '@/test/row-action-helpers'

const { success, error } = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, subtitle, action, children }: PropsWithChildren<{ title: string; subtitle?: string; action?: React.ReactNode }>) => <main><h1>{title}</h1><p>{subtitle}</p>{action}{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success, error } }))
vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

const hospital = { id: 'hospital-1', nome: 'Hospital Central', cnpj: '12345678000190' }
const activeUser: TenantUser = { id: 'user-1', codigo: 'USR-01', nome: 'Clara Mendes', email: 'clara@example.com', role: 'tecnico', ativo: true }
let users: TenantUser[] = []
let hospitalLinks = new Map<string, string[]>()
let rejectedHospitalId: string | null = null

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><UsersPage /></QueryClientProvider>)
}

function configureApi() {
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/users') return { data: users } as never
    if (url === '/hospitais') return { data: [hospital] } as never
    const linkMatch = url.match(/^\/users\/([^/]+)\/hospitais$/)
    if (linkMatch) return { data: hospitalLinks.get(linkMatch[1]) ?? [] } as never
    const userMatch = url.match(/^\/users\/([^/]+)$/)
    if (userMatch) return { data: users.find((item) => item.id === userMatch[1]) } as never
    throw new Error(`Unexpected GET ${url}`)
  })
  vi.mocked(apiClient.post).mockImplementation(async (url, body) => {
    if (url === '/users') {
      const input = body as { codigo: string; nome: string; email: string; role: TenantUser['role'] }
      const created: TenantUser = { id: 'user-new', ...input, ativo: true }
      users = [...users, created]
      return { data: created } as never
    }
    if (/^\/users\/[^/]+\/anonimizar-cpf$/.test(url)) return { data: {} } as never
    const linkMatch = url.match(/^\/users\/([^/]+)\/hospitais\/([^/]+)$/)
    if (linkMatch) {
      const [, userId, hospitalId] = linkMatch
      if (rejectedHospitalId === hospitalId) throw { response: { data: { detail: 'Vínculo indisponível.' } } }
      hospitalLinks.set(userId, [...(hospitalLinks.get(userId) ?? []), hospitalId])
      return { data: {} } as never
    }
    const deactivateMatch = url.match(/^\/users\/([^/]+)\/desativar$/)
    if (deactivateMatch) {
      users = users.map((item) => item.id === deactivateMatch[1] ? { ...item, ativo: false } : item)
      return { data: {} } as never
    }
    throw new Error(`Unexpected POST ${url}`)
  })
  vi.mocked(apiClient.put).mockResolvedValue({ data: activeUser } as never)
  vi.mocked(apiClient.delete).mockImplementation(async (url) => {
    const match = url.match(/^\/users\/([^/]+)\/hospitais\/([^/]+)$/)
    if (match) hospitalLinks.set(match[1], (hospitalLinks.get(match[1]) ?? []).filter((id) => id !== match[2]))
    return { data: {} } as never
  })
}

beforeEach(() => {
  users = []
  hospitalLinks = new Map()
  rejectedHospitalId = null
  vi.clearAllMocks()
  configureApi()
})

afterEach(() => { clearAuthSession(); vi.resetAllMocks() })

describe('UsersPage F2.2', () => {
  it('shows a loading skeleton while the users request is pending', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/users') {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return { data: [] } as never
      }
      if (url === '/hospitais') return { data: [hospital] } as never
      return { data: [] } as never
    })
    renderPage()
    expect(screen.getByLabelText('Carregando usuários')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByText('Nenhum usuário cadastrado')).toBeInTheDocument()
  })

  it('offers a create action for an empty list and a retry action on errors', async () => {
    const user = userEvent.setup()
    const view = renderPage()
    expect(await screen.findByText('Nenhum usuário cadastrado')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Convidar usuário' })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    view.unmount()

    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/users') throw new Error('offline')
      if (url === '/hospitais') return { data: [hospital] } as never
      return { data: [] } as never
    })
    const utils = renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os usuários.')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    utils.unmount()
  })

  it('creates a tenant user with an allowed role and hospital links without claiming an invitation was sent', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Convidar usuário' }))

    const roleSelect = screen.getByLabelText('Papel')
    expect(await listOptions(user, roleSelect)).toEqual(['Admin do Cliente', 'Técnico', 'Interno do Hospital'])
    await chooseOption(user, roleSelect, 'Interno do Hospital')
    await user.type(screen.getByLabelText('Código'), 'USR-02')
    await user.type(screen.getByLabelText('Nome'), 'Leo Silva')
    await user.type(screen.getByLabelText('E-mail'), 'leo@example.com')
    await user.click(screen.getByText('Adicionar hospital'))
    await user.click(await screen.findByRole('button', { name: 'Hospital Central' }))
    expect(screen.getByRole('button', { name: 'Remover vínculo Hospital Central' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/users', {
      codigo: 'USR-02', nome: 'Leo Silva', email: 'leo@example.com', role: 'interno_hospital',
    }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/users/user-new/hospitais/hospital-1'))
    expect(await screen.findByText('Leo Silva')).toBeInTheDocument()
    expect(success).toHaveBeenCalledWith('Registro de usuário criado. O envio do convite pelo provedor ainda não está disponível.')
  })

  it('keeps the dialog open after a partial link failure and retries links without creating a duplicate user', async () => {
    const user = userEvent.setup()
    rejectedHospitalId = 'hospital-1'
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Convidar usuário' }))
    await user.type(screen.getByLabelText('Código'), 'USR-02')
    await user.type(screen.getByLabelText('Nome'), 'Leo Silva')
    await user.type(screen.getByLabelText('E-mail'), 'leo@example.com')
    await user.click(screen.getByText('Adicionar hospital'))
    await user.click(await screen.findByRole('button', { name: 'Hospital Central' }))
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('1 vínculo(s) de hospital não foram atualizados')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rejectedHospitalId = null
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tentar vínculos novamente' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Tentar vínculos novamente' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(3))
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/users', expect.any(Object))
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/users/user-new/hospitais/hospital-1')
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/users/user-new/hospitais/hospital-1')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('updates the visible status after a confirmed deactivation', async () => {
    const user = userEvent.setup()
    users = [activeUser]
    renderPage()
    await screen.findByText('Clara Mendes')
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    await chooseRowAction(user, 'Ações de Clara Mendes', 'Desativar')
    await confirmRowAction(user, 'Desativar')

    expect(await screen.findByText('Inativo')).toBeInTheDocument()
    expect(apiClient.post).toHaveBeenCalledWith('/users/user-1/desativar')
    expect(success).toHaveBeenCalledWith('Usuário desativado.')
  })

  it('opens the edit form from the row actions menu', async () => {
    const user = userEvent.setup()
    users = [activeUser]
    renderPage()
    await screen.findByText('Clara Mendes')
    await chooseRowAction(user, 'Ações de Clara Mendes', 'Editar')
    expect(await screen.findByRole('dialog', { name: 'Editar usuário' })).toBeInTheDocument()
  })

  it('does not deactivate when the operator cancels the menu confirmation', async () => {
    const user = userEvent.setup()
    users = [activeUser]
    renderPage()
    await screen.findByText('Clara Mendes')
    await chooseRowAction(user, 'Ações de Clara Mendes', 'Desativar')
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(apiClient.post).not.toHaveBeenCalledWith('/users/user-1/desativar')
    expect(screen.getByText('Ativo')).toBeInTheDocument()
  })

  it('hides anonymization from roles without permission', async () => {
    users = [activeUser]
    setAuthSession('token', { id: 'tec-1', name: 'Técnico', roles: ['tecnico'] })
    renderPage()
    await screen.findByText('Clara Mendes')
    expect(await listRowActions(userEvent.setup(), 'Ações de Clara Mendes')).toEqual(['Editar', 'Desativar'])
  })

  it('requires an exact name confirmation and calls the CPF anonymization endpoint', async () => {
    const user = userEvent.setup()
    users = [activeUser]
    setAuthSession('token', { id: 'admin-1', name: 'Admin', roles: ['admin_cliente'] })
    renderPage()
    await screen.findByText('Clara Mendes')
    await chooseRowAction(user, 'Ações de Clara Mendes', 'Anonimizar CPF')
    const confirmButton = within(screen.getByRole('dialog')).getByRole('button', { name: /^Anonimizar CPF$/ })
    expect(confirmButton).toBeDisabled()
    const nameInput = screen.getByLabelText('Confirmação do nome do usuário')
    await user.type(nameInput, 'Outra pessoa')
    expect(confirmButton).toBeDisabled()
    await user.clear(nameInput)
    await user.type(nameInput, '  Clara Mendes  ')
    expect(confirmButton).toBeEnabled()
    await user.click(confirmButton)

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/users/user-1/anonimizar-cpf'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(success).toHaveBeenCalledWith('CPF anonimizado. Os dados do usuário foram atualizados.')
  })

  it('does not send a request when the operator cancels the confirmation', async () => {
    const user = userEvent.setup()
    users = [activeUser]
    setAuthSession('token', { id: 'admin-1', name: 'Admin', roles: ['admin_cliente'] })
    renderPage()
    await screen.findByText('Clara Mendes')
    await chooseRowAction(user, 'Ações de Clara Mendes', 'Anonimizar CPF')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalledWith('/users/user-1/anonimizar-cpf')
  })

  it('keeps the confirmation open and preserves the name after an API error', async () => {
    const user = userEvent.setup()
    users = [activeUser]
    setAuthSession('token', { id: 'admin-1', name: 'Admin', roles: ['admin_cliente'] })
    vi.mocked(apiClient.post).mockImplementation(async (url) => {
      if (url === '/users/user-1/anonimizar-cpf') throw { response: { data: { detail: 'CPF já anonimizado.' } } }
      throw new Error(`Unexpected POST ${url}`)
    })
    renderPage()
    await screen.findByText('Clara Mendes')
    await chooseRowAction(user, 'Ações de Clara Mendes', 'Anonimizar CPF')
    const nameInput = screen.getByLabelText('Confirmação do nome do usuário')
    await user.type(nameInput, 'Clara Mendes')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Anonimizar CPF$/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('CPF já anonimizado.')
    expect(nameInput).toHaveValue('Clara Mendes')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not expose anonymization for a platform user', async () => {
    users = [{ ...activeUser, role: 'platform_user' as TenantUser['role'] }]
    setAuthSession('token', { id: 'admin-1', name: 'Admin', roles: ['admin_cliente'] })
    renderPage()

    await screen.findByText('Clara Mendes')
    expect(await listRowActions(userEvent.setup(), 'Ações de Clara Mendes')).toEqual(['Editar', 'Desativar'])
  })

  it('exposes the action to a Super Admin when the current user endpoint returns a tenant user', async () => {
    users = [activeUser]
    setAuthSession('token', { id: 'platform-admin', name: 'Super Admin', roles: ['super_admin'] })
    renderPage()

    await screen.findByText('Clara Mendes')
    expect(await listRowActions(userEvent.setup(), 'Ações de Clara Mendes')).toContain('Anonimizar CPF')
  })
})
