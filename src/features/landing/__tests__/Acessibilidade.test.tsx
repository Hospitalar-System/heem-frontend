/* eslint-disable testing-library/no-node-access, testing-library/no-container -- varredura estrutural da página inteira (alt, nomes acessíveis) */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme-provider'
import { LandingPage } from '../pages/LandingPage'
import { PoliticaPrivacidadePage, TermosDeUsoPage } from '../pages/PaginasLegais'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia
})

const paginas = [
  ['landing', <LandingPage key="l" />],
  ['política de privacidade', <PoliticaPrivacidadePage key="p" />],
  ['termos de uso', <TermosDeUsoPage key="t" />],
] as const

describe.each(paginas)('acessibilidade: %s', (_nome, pagina) => {
  function renderizar() {
    return render(
      <ThemeProvider>
        <MemoryRouter>{pagina}</MemoryRouter>
      </ThemeProvider>,
    )
  }

  it('tem um único h1, sem pular níveis de título', () => {
    const { container } = renderizar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const niveis = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => Number(h.tagName[1]))
    niveis.forEach((nivel, i) => {
      if (i > 0) expect(nivel - niveis[i - 1]).toBeLessThanOrEqual(1)
    })
  })

  it('imagens têm alt, ícones decorativos ficam ocultos e SVG informativo tem nome', () => {
    const { container } = renderizar()
    for (const img of Array.from(container.querySelectorAll('img'))) expect(img.getAttribute('alt')?.length ?? 0).toBeGreaterThan(5)
    for (const svg of Array.from(container.querySelectorAll('svg'))) {
      const oculto = svg.getAttribute('aria-hidden') === 'true' || svg.closest('[aria-hidden="true"]') !== null
      expect(oculto || svg.getAttribute('role') === 'img').toBe(true)
      if (!oculto) expect(svg.getAttribute('aria-label')?.length ?? 0).toBeGreaterThan(5)
    }
  })

  it('todo link e botão tem nome acessível, e há skip link como primeiro foco', async () => {
    renderizar()
    for (const item of [...screen.getAllByRole('link'), ...screen.queryAllByRole('button')]) {
      expect((item.textContent ?? '').trim() || item.getAttribute('aria-label')).toBeTruthy()
    }
    await userEvent.setup().tab()
    expect(screen.getByRole('link', { name: 'Ir para o conteúdo' })).toHaveFocus()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo')
  })
})
