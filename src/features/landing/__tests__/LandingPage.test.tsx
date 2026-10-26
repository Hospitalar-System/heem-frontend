import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme-provider'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { NOME_PRODUTO } from '../brand'
import { LandingPage } from '../pages/LandingPage'

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function renderLanding() {
  return render(
    <ThemeProvider>
      <MemoryRouter><LandingPage /></MemoryRouter>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  mockReducedMotion(false)
  clearAuthSession()
})
afterEach(() => clearAuthSession())

describe('LandingPage', () => {
  it('renderiza hero, seções com âncoras e semântica', () => {
    renderLanding()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A engenharia clínica, em ordem.')
    for (const [id, titulo] of [
      ['produto', 'O produto'],
      ['recursos', 'Tudo o que a rotina precisa. Nada além disso.'],
      ['conformidade', 'As normas viram parte do trabalho, não uma etapa à parte.'],
      ['para-quem', 'Cada pessoa vê só o que precisa.'],
      ['contato', `Veja o ${NOME_PRODUTO} com os equipamentos do seu hospital.`],
    ]) {
      const section = screen.getByRole('region', { name: titulo })
      expect(section).toHaveAttribute('id', id)
      expect(within(section).getByRole('heading', { level: 2 })).toBeInTheDocument()
    }
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('tem skip link para o conteúdo', () => {
    renderLanding()
    const skip = screen.getByRole('link', { name: 'Ir para o conteúdo' })
    expect(skip).toHaveAttribute('href', '#conteudo')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
  })

  it('"Entrar" aponta para /login sem sessão', () => {
    renderLanding()
    for (const regiao of [screen.getByRole('banner'), screen.getByRole('contentinfo')]) {
      expect(within(regiao).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    }
  })

  it('"Entrar" leva ao painel do papel quando há sessão', () => {
    act(() => {
      setAuthSession('token', { id: '1', name: 'Ana', email: 'a@b.c', roles: ['tecnico'], tenantId: 't' })
    })
    renderLanding()
    for (const regiao of [screen.getByRole('banner'), screen.getByRole('contentinfo')]) {
      expect(within(regiao).getByRole('link', { name: 'Ir para o painel' })).toHaveAttribute('href', '/dashboard')
    }
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('"Agendar demonstração" é botão que abre o formulário (não mais link para #contato)', async () => {
    const user = userEvent.setup()
    renderLanding()
    expect(screen.queryByRole('link', { name: 'Agendar demonstração' })).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Agendar demonstração' })[0])
    expect(screen.getByRole('dialog', { name: 'Quero conhecer o HEEM' })).toBeInTheDocument()
  })

  it('links de navegação e rodapé existem', () => {
    renderLanding()
    const nav = screen.getByRole('navigation', { name: 'Seções da página' })
    for (const label of ['Recursos', 'Conformidade', 'Para quem', 'Contato']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }
    const footer = screen.getByRole('navigation', { name: 'Rodapé' })
    expect(within(footer).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
    expect(within(footer).getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos')
    expect(screen.getByText('Telas e números são exemplos ilustrativos.')).toBeInTheDocument()
  })

  it('usa o nome do produto vindo do módulo de marca', () => {
    renderLanding()
    expect(screen.getAllByText(NOME_PRODUTO).length).toBeGreaterThanOrEqual(2)
  })

  it('alterna o tema pelo seletor', async () => {
    const user = userEvent.setup()
    renderLanding()
    await user.click(screen.getByRole('button', { name: 'Selecionar tema' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Claro' }))
    expect(document.documentElement).toHaveClass('light')
  })

  it('mostra a barra de progresso e a omite com prefers-reduced-motion', () => {
    const { unmount } = renderLanding()
    expect(screen.getByTestId('scroll-progress')).toBeInTheDocument()
    unmount()
    mockReducedMotion(true)
    renderLanding()
    expect(screen.queryByTestId('scroll-progress')).not.toBeInTheDocument()
  })
})

describe('landing sem terceiros', () => {
  it('fontes e estilos não referenciam domínios externos', () => {
    const dir = path.resolve(import.meta.dirname, '..')
    const files = [
      'landing.css',
      'brand.ts',
      'components/LandingLayout.tsx',
      'components/Marca.tsx',
      'components/button-classes.ts',
      'components/ScrollProgress.tsx',
      'pages/LandingPage.tsx',
    ]
    const external = /googleapis|gstatic|@import\s+url\(\s*['"]?https?:/i
    const offenders = files.filter((file) => external.test(readFileSync(path.join(dir, file), 'utf8')))
    expect(offenders).toEqual([])
    expect(readFileSync(path.resolve(dir, '../../../index.html'), 'utf8')).not.toMatch(/googleapis|gstatic/i)
  })

  it('nenhum arquivo da landing carrega URL externa (exceto github.com, localhost e o namespace SVG)', () => {
    const dir = path.resolve(import.meta.dirname, '..')
    const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter(
      (file) => /\.(tsx?|css)$/.test(file) && !file.includes('__tests__'),
    )
    expect(files.length).toBeGreaterThan(15)
    const allowed = /^https?:\/\/(www\.w3\.org|github\.com|localhost)/
    const offenders = files.filter((file) => {
      const urls = readFileSync(path.join(dir, file), 'utf8').match(/https?:\/\/[^\s'"`)]+/g) ?? []
      return urls.some((url) => !allowed.test(url))
    })
    expect(offenders).toEqual([])
  })
})
