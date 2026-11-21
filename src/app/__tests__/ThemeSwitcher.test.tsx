import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../theme-provider'
import { ThemeSwitcher } from '../ThemeSwitcher'

function renderSwitcher(variant?: 'panel' | 'landing') {
  return render(<ThemeProvider><ThemeSwitcher variant={variant} /></ThemeProvider>)
}

const originalMatchMedia = window.matchMedia

function mockSystemDark(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? dark : false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null,
  }))
}

describe('ThemeSwitcher (botão sol/lua)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.matchMedia = originalMatchMedia
    localStorage.clear()
    document.documentElement.classList.remove('dark', 'light', 'auto')
  })

  it('começa escuro, com rótulo que diz a ação, e alterna claro/escuro sem menu', async () => {
    const user = userEvent.setup()
    renderSwitcher()
    const button = screen.getByRole('button', { name: 'Mudar para o tema claro' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button).not.toHaveAttribute('aria-pressed')
    await user.click(button)
    expect(document.documentElement).toHaveClass('light')
    await user.click(screen.getByRole('button', { name: 'Mudar para o tema escuro' }))
    expect(document.documentElement).toHaveClass('dark')
  })

  it('persiste a escolha no armazenamento', async () => {
    const user = userEvent.setup()
    renderSwitcher()
    await user.click(screen.getByRole('button', { name: 'Mudar para o tema claro' }))
    expect(localStorage.getItem('heem-theme-mode')).toBe('light')
  })

  it('desliga as transições do resto da página só durante a troca (2 quadros), sem deixar o atributo preso', async () => {
    const user = userEvent.setup()
    renderSwitcher()
    await user.click(screen.getByRole('button', { name: 'Mudar para o tema claro' }))
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(true)
    await waitFor(() => expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(false))
  })

  it('funciona por teclado (Enter e Espaço)', async () => {
    const user = userEvent.setup()
    renderSwitcher()
    screen.getByRole('button', { name: 'Mudar para o tema claro' }).focus()
    await user.keyboard('{Enter}')
    expect(document.documentElement).toHaveClass('light')
    await user.keyboard(' ')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('valor salvo "auto": o rótulo segue o sistema e o primeiro clique vai para o oposto do que aparece', async () => {
    mockSystemDark(true)
    localStorage.setItem('heem-theme-mode', 'auto')
    const user = userEvent.setup()
    renderSwitcher()
    await user.click(screen.getByRole('button', { name: 'Mudar para o tema claro' }))
    expect(localStorage.getItem('heem-theme-mode')).toBe('light')
  })

  it('animação só com transform e opacity, com variante para prefers-reduced-motion e sem transition-all', () => {
    renderSwitcher()
    const icon = document.querySelector('[data-icon="sun"]') // eslint-disable-line testing-library/no-node-access
    expect(icon?.getAttribute('class')).toContain('transition-[transform,opacity]')
    expect(icon?.getAttribute('class')).toContain('duration-[250ms]')
    expect(icon?.getAttribute('class')).toContain('motion-reduce:rotate-0')
    expect(icon?.getAttribute('class')).toContain('motion-reduce:scale-100')
    expect(icon?.getAttribute('class')).not.toContain('transition-all')
  })

  it('variante landing é redonda de 44 px e a do painel tem o tamanho do sino', () => {
    const { unmount } = renderSwitcher('landing')
    expect(screen.getByRole('button').className).toContain('size-11')
    expect(screen.getByRole('button').className).toContain('rounded-full')
    unmount()
    renderSwitcher()
    expect(screen.getByRole('button').className).toContain('size-[38px]')
  })
})
