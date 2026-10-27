/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from '@/components/ui/Modal'
import { AdminPageShell } from '../AdminPageShell'

vi.mock('@/app/ThemeSwitcher', () => ({ ThemeSwitcher: () => null }))
vi.mock('@/features/dashboard/components/NotificationsPopover', () => ({ NotificationsPopover: () => null }))
vi.mock('@/features/dashboard/components/DashboardSidebar', () => ({ DashboardSidebar: () => <aside aria-label="Navegação principal" /> }))

describe('AdminPageShell — scroll único', () => {
  it('não cria quadro de rolagem em volta do conteúdo', () => {
    const { container } = render(<AdminPageShell title="Relatórios"><p>Conteúdo</p></AdminPageShell>)
    const main = container.querySelector('main')!
    expect(main.className).toContain('min-h-screen')
    expect(main.className).not.toMatch(/(^| )h-screen|h-\[100dvh\]|overflow-/)
    const content = screen.getByText('Conteúdo').parentElement!
    expect(content.className).not.toMatch(/overflow-|(^| )h-screen/)
  })

  it('mantém a barra lateral fixa na janela (sticky, altura da viewport)', () => {
    render(<AdminPageShell title="Relatórios" />)
    const wrapper = screen.getAllByLabelText('Navegação principal')[0].parentElement!
    expect(wrapper.className).toContain('sticky')
    expect(wrapper.className).toContain('top-0')
    expect(wrapper.className).toContain('h-screen')
  })

  it('trava o scroll do documento só enquanto o drawer mobile está aberto', async () => {
    render(<AdminPageShell title="Relatórios" />)
    expect(document.body.style.overflow).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir navegação' }))
    expect(document.body.style.overflow).toBe('hidden')
    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
    expect(document.body.style.overflow).toBe('')
  })
})

describe('Modal — scroll do documento', () => {
  it('bloqueia o scroll do body enquanto aberto e restaura ao fechar', () => {
    const { unmount } = render(<Modal title="Teste" onClose={() => {}}>corpo</Modal>)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
