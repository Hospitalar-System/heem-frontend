import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { FieldHint } from '../components/FieldHint'
import { PreventiveCampaignFormPage } from '../pages/PreventiveCampaignFormPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const HELP = 'Define o período em que uma OT preventiva aberta faz o equipamento ser pulado.'

describe('FieldHint', () => {
  it('é um botão acessível ligado ao tooltip por aria-describedby, fechado por padrão', () => {
    render(<div className="relative"><FieldHint label="Data final">{HELP}</FieldHint></div>)
    const button = screen.getByRole('button', { name: 'Ajuda: Data final' })
    const tip = screen.getByRole('tooltip', { hidden: true })
    expect(button).toHaveAttribute('aria-describedby', tip.id)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(tip).not.toBeVisible()
    expect(tip).toHaveTextContent(HELP)
  })

  it('abre ao receber foco por teclado e fecha ao sair', async () => {
    const user = userEvent.setup()
    render(<div><FieldHint label="Data final">{HELP}</FieldHint><button type="button">Outro</button></div>)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Ajuda: Data final' })).toHaveFocus()
    expect(screen.getByRole('tooltip')).toBeVisible()
    await user.tab()
    expect(screen.getByRole('tooltip', { hidden: true })).not.toBeVisible()
  })

  it('abre ao passar o mouse e fecha ao sair', async () => {
    const user = userEvent.setup()
    render(<FieldHint label="Data final">{HELP}</FieldHint>)
    await user.hover(screen.getByRole('button', { name: 'Ajuda: Data final' }))
    expect(screen.getByRole('tooltip')).toBeVisible()
    await user.unhover(screen.getByRole('button', { name: 'Ajuda: Data final' }))
    expect(screen.getByRole('tooltip', { hidden: true })).not.toBeVisible()
  })

  it('fecha com Esc sem propagar o evento (não fecha o modal em volta)', async () => {
    const user = userEvent.setup()
    const outer = vi.fn()
    render(<div onKeyDown={outer}><FieldHint label="Data final">{HELP}</FieldHint></div>)
    await user.tab()
    expect(screen.getByRole('tooltip')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('tooltip', { hidden: true })).not.toBeVisible()
    expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
    await user.keyboard('{Escape}')
    expect(outer).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
  })

  it('também abre por clique (toque) e fecha com Esc', async () => {
    const user = userEvent.setup()
    render(<FieldHint label="Data final">{HELP}</FieldHint>)
    const button = screen.getByRole('button', { name: 'Ajuda: Data final' })
    await user.click(button)
    expect(screen.getByRole('tooltip')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('tooltip', { hidden: true })).not.toBeVisible()
  })
})

describe('Formulário de campanha: alinhamento dos campos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/hospitais') return { data: [{ id: 'h1', nome: 'Santa Casa', cnpj: '' }] } as never
      return { data: [] } as never
    })
  })

  function renderForm() {
    function Providers({ children }: PropsWithChildren) {
      const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
      return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
    }
    return render(<PreventiveCampaignFormPage />, { wrapper: Providers })
  }

  it('Data de início, Data final e Recorrência ficam na mesma linha da grade, sem texto de ajuda embaixo dos campos', async () => {
    renderForm()
    const row = await screen.findByRole('group', { name: 'Período e recorrência' })
    // As três células da linha: rótulo + campo, sem parágrafo de ajuda que empurre o campo para baixo.
    expect(within(row).getByText('Data de início')).toBeInTheDocument()
    expect(within(row).getByText('Data final (opcional)')).toBeInTheDocument()
    expect(within(row).getByText('Recorrência')).toBeInTheDocument()
    expect(within(row).queryAllByRole('paragraph')).toHaveLength(0)
    // A explicação mora no tooltip ao lado do rótulo (único ícone da linha), fechado e fora do fluxo.
    const button = within(row).getByRole('button', { name: 'Ajuda: Data final (opcional)' })
    expect(within(row).getAllByRole('button', { name: /^Ajuda:/ })).toHaveLength(1)
    const tip = within(row).getByRole('tooltip', { hidden: true })
    expect(button).toHaveAttribute('aria-describedby', tip.id)
    expect(tip).toHaveTextContent(/faz o equipamento ser pulado/)
    expect(tip).not.toBeVisible()
    expect(tip).toHaveClass('absolute')
  })

  it('a explicação do modo de atribuição também vai para o tooltip (descrição acessível do ícone)', async () => {
    renderForm()
    const button = await screen.findByRole('button', { name: 'Ajuda: Atribuição das OTs' })
    expect(button).toHaveAccessibleDescription(/priorizando quem tem menos OTs abertas/)
  })
})
