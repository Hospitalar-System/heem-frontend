import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { UsersPage } from '../pages/UsersPage'
import type { TenantUser } from '../types'

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

afterEach(() => vi.resetAllMocks())

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
    expect(within(roleSelect).getAllByRole('option').map((option) => option.getAttribute('value'))).toEqual(['admin_cliente', 'tecnico', 'interno_hospital'])
    await user.selectOptions(roleSelect, 'interno_hospital')
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
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('Clara Mendes')
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desativar' }))

    expect(await screen.findByText('Inativo')).toBeInTheDocument()
    expect(apiClient.post).toHaveBeenCalledWith('/users/user-1/desativar')
    expect(success).toHaveBeenCalledWith('Usuário desativado.')
  })
})
