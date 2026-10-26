/* data-reveal, data-draw e o CSS da landing só são acessíveis por consulta direta ao DOM / ao arquivo. */
/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme-provider'
import { JanelaIndicadores } from '../components/JanelaIndicadores'
import { Reveal } from '../components/Reveal'
import { ScrollProgress } from '../components/ScrollProgress'
import { LandingPage } from '../pages/LandingPage'

const css = readFileSync(path.resolve(__dirname, '../landing.css'), 'utf8')

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

class FakeObserver {
  static instances: FakeObserver[] = []
  callback: (entries: { isIntersecting: boolean }[]) => void
  options?: IntersectionObserverInit
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    FakeObserver.instances.push(this)
  }
  observe = vi.fn()
  disconnect = vi.fn()
  entrar() {
    act(() => this.callback([{ isIntersecting: true }]))
  }
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
  FakeObserver.instances = []
  vi.stubGlobal('IntersectionObserver', FakeObserver)
})
afterEach(() => vi.unstubAllGlobals())

describe('revelar ao rolar', () => {
  it('só esconde (pending) depois do observador ativo, com os parâmetros da referência', () => {
    const { container } = render(<Reveal>x</Reveal>)
    expect(FakeObserver.instances).toHaveLength(1)
    expect(FakeObserver.instances[0].observe).toHaveBeenCalledTimes(1)
    expect(FakeObserver.instances[0].options).toEqual({ threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    expect(container.firstElementChild).toHaveAttribute('data-reveal', 'pending')
  })

  it('sem IntersectionObserver o conteúdo nunca é escondido', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = render(<Reveal>x</Reveal>)
    expect(container.firstElementChild).not.toHaveAttribute('data-reveal')
  })

  it('se criar o observador falhar o conteúdo continua visível', () => {
    vi.stubGlobal('IntersectionObserver', function Quebrado() {
      throw new Error('falhou')
    })
    const { container } = render(<Reveal>x</Reveal>)
    expect(container.firstElementChild).not.toHaveAttribute('data-reveal')
  })

  it('vira "in" ao entrar na tela e para de observar', () => {
    const { container } = render(<Reveal>x</Reveal>)
    FakeObserver.instances[0].entrar()
    expect(container.firstElementChild).toHaveAttribute('data-reveal', 'in')
    expect(FakeObserver.instances[0].disconnect).toHaveBeenCalled()
  })

  it('não revela enquanto o elemento não intersecta', () => {
    const { container } = render(<Reveal>x</Reveal>)
    act(() => FakeObserver.instances[0].callback([{ isIntersecting: false }]))
    expect(container.firstElementChild).toHaveAttribute('data-reveal', 'pending')
  })

  it('escalona o atraso e aceita as variações up, left, right e scale', () => {
    const { container } = render(
      <>
        <Reveal>a</Reveal>
        <Reveal delay={90} variant="left">b</Reveal>
        <Reveal delay={180} variant="right">c</Reveal>
        <Reveal delay={300} variant="scale">d</Reveal>
      </>,
    )
    const els = Array.from(container.children) as HTMLElement[]
    expect(els.map((el) => el.dataset.revealVariant)).toEqual(['up', 'left', 'right', 'scale'])
    expect(els.map((el) => el.style.getPropertyValue('--reveal-delay'))).toEqual(['0ms', '90ms', '180ms', '300ms'])
  })

  it('elementos montados depois (abas, painéis) ganham o próprio observador', () => {
    const { rerender, container } = render(<Reveal>a</Reveal>)
    rerender(<><Reveal>a</Reveal><Reveal>b</Reveal></>)
    expect(FakeObserver.instances.length).toBeGreaterThanOrEqual(2)
    const novo = container.children[1]
    expect(novo).toHaveAttribute('data-reveal', 'pending')
    FakeObserver.instances[FakeObserver.instances.length - 1].entrar()
    expect(novo).toHaveAttribute('data-reveal', 'in')
  })

  it('o CSS define a posição inicial de cada variação e o estado final', () => {
    expect(css).toMatch(/\[data-reveal='pending'\]\s*\{[^}]*translateY\(28px\)/)
    expect(css).toMatch(/\[data-reveal-variant='scale'\]\s*\{[^}]*translateY\(24px\) scale\(0\.94\)/)
    expect(css).toMatch(/\[data-reveal-variant='left'\]\s*\{[^}]*translateX\(-28px\)/)
    expect(css).toMatch(/\[data-reveal-variant='right'\]\s*\{[^}]*translateX\(28px\)/)
    expect(css).toMatch(/\[data-reveal='in'\]\s*\{[^}]*opacity: 1;[^}]*transform: none/)
  })

  it('a landing usa os atrasos da referência: cartões 90 ms, perfis 100 ms (scale), normas 120 ms', () => {
    const { container } = renderLanding()
    const atrasos = (seletor: string) => Array.from(container.querySelectorAll<HTMLElement>(seletor)).map((el) => el.style.getPropertyValue('--reveal-delay'))
    expect(atrasos('#recursos [data-reveal]').slice(1, 4)).toEqual(['0ms', '90ms', '180ms'])
    const perfis = Array.from(container.querySelectorAll<HTMLElement>('#para-quem [data-reveal-variant="scale"]'))
    expect(perfis.map((el) => el.style.getPropertyValue('--reveal-delay'))).toEqual(['0ms', '100ms', '200ms', '300ms'])
    expect(atrasos('#conformidade [data-reveal]')).toContain('120ms')
    expect(container.querySelector('#contato [data-reveal-variant="scale"]')).not.toBeNull()
    expect(container.querySelector('#produto [data-reveal-variant="scale"]')).not.toBeNull()
  })
})

describe('entrada do hero em cascata', () => {
  it('os filhos do hero entram com atrasos escalonados 0/.1/.2/.3/.4 s', () => {
    const { container } = renderLanding()
    const filhos = Array.from(container.querySelectorAll<HTMLElement>('.landing-hero .landing-hin'))
    expect(filhos.map((el) => el.style.animationDelay)).toEqual(['', '100ms', '200ms', '300ms', '400ms'])
    expect(css).toMatch(/\.landing-hin\s*\{\s*animation: landing-hin 0\.8s/)
  })
})

describe('barra de progresso e sombra da navegação', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 })
  })
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })

  it('a barra acompanha a rolagem (scaleX)', () => {
    render(<ScrollProgress />)
    const barra = screen.getByTestId('scroll-progress')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 })
    fireEvent.scroll(window)
    expect(barra.style.transform).toBe('scaleX(0.5)')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 5000 })
    fireEvent.scroll(window)
    expect(barra.style.transform).toBe('scaleX(1)')
    expect(css).toMatch(/\.landing-progress\s*\{[^}]*will-change: transform/)
  })

  it('com reduced motion a barra não é renderizada', () => {
    mockReducedMotion(true)
    render(<ScrollProgress />)
    expect(screen.queryByTestId('scroll-progress')).toBeNull()
  })

  it('a nav ganha "scrolled" só depois de 8 px', () => {
    renderLanding()
    const nav = screen.getByRole('banner')
    expect(nav).toHaveAttribute('data-scrolled', 'false')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 8 })
    fireEvent.scroll(window)
    expect(nav).toHaveAttribute('data-scrolled', 'false')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 9 })
    fireEvent.scroll(window)
    expect(nav).toHaveAttribute('data-scrolled', 'true')
    expect(css).toMatch(/\.landing-nav\[data-scrolled='true'\]\s*\{[^}]*box-shadow/)
  })
})

describe('linha do gráfico', () => {
  it('só é desenhada quando a janela entra na tela', () => {
    const { container } = render(<JanelaIndicadores />)
    const janela = container.firstElementChild as HTMLElement
    expect(janela).toHaveAttribute('data-draw', 'pending')
    FakeObserver.instances[0].entrar()
    expect(janela).toHaveAttribute('data-draw', 'in')
    expect(css).toMatch(/\[data-draw='pending'\] \.landing-chart-line\s*\{[^}]*stroke-dashoffset: 1200/)
    expect(css).toMatch(/\[data-draw='in'\] \.landing-chart-line\s*\{[^}]*stroke-dashoffset: 0;[^}]*transition: stroke-dashoffset 1\.6s ease 0\.3s/)
  })

  it('sem observador (ou com reduced motion) a linha fica inteira, sem atributo de desenho', () => {
    mockReducedMotion(true)
    const { container } = render(<JanelaIndicadores />)
    expect(container.firstElementChild).not.toHaveAttribute('data-draw')
    expect(FakeObserver.instances).toHaveLength(0)
  })
})

describe('sem reduced motion todas as animações ficam ativas', () => {
  it('barra, revelações, gráfico e cascata do hero estão armados', () => {
    const { container } = renderLanding()
    expect(screen.getByTestId('scroll-progress')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-reveal="pending"]').length).toBeGreaterThan(8)
    expect(container.querySelector('[data-draw="pending"]')).not.toBeNull()
    expect(container.querySelectorAll('.landing-hero .landing-hin')).toHaveLength(5)
    expect(FakeObserver.instances.length).toBeGreaterThan(9)
    expect(css).toMatch(/\.landing-hin\s*\{\s*animation: landing-hin 0\.8s/)
    expect(css).toMatch(/\.landing \.landing-painel\s*\{\s*animation: landing-hin 0\.45s/)
  })
})

describe('prefers-reduced-motion no CSS', () => {
  const bloco = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))

  it('remove movimento, mas não desliga tudo: sobra fade curto e o conteúdo fica visível', () => {
    expect(bloco).not.toMatch(/translate[XY]?\((?!none)/)
    expect(bloco).not.toMatch(/scale\(/)
    expect(bloco).toMatch(/animation: landing-fade 0\.15s/)
    expect(bloco).toMatch(/\[data-reveal='pending'\][^{]*\{[^}]*opacity: 1;[^}]*transform: none/)
    expect(bloco).toMatch(/stroke-dasharray: none/)
    expect(bloco).toMatch(/\.landing-chip-norma:hover\s*\{\s*transform: none/)
    expect(css).toMatch(/@keyframes landing-fade\s*\{\s*from \{ opacity: 0; \}\s*to \{ opacity: 1; \}/)
  })

  it('a landing inteira fica visível, sem barra e sem atributos de revelação', () => {
    mockReducedMotion(true)
    const { container } = renderLanding()
    expect(container.querySelector('[data-reveal], [data-draw]')).toBeNull()
    expect(screen.queryByTestId('scroll-progress')).toBeNull()
    expect(FakeObserver.instances).toHaveLength(0)
  })
})
