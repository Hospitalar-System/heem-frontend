/* Os atributos data-reveal e os ids de painel (aria-controls) só são acessíveis por consulta direta ao DOM. */
/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme-provider'
import { TELA_ALTURA, TELA_LARGURA } from '../assets/telas'
import { TelaApp } from '../components/TelaApp'
import { Reveal } from '../components/Reveal'
import { NOME_PRODUTO } from '../brand'
import { normas } from '../content/normas'
import { paineis } from '../content/vitrine'
import { LandingPage } from '../pages/LandingPage'

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function renderLanding(onAgendar?: (interesse?: string) => void) {
  return render(
    <ThemeProvider>
      <MemoryRouter><LandingPage onAgendar={onAgendar} /></MemoryRouter>
    </ThemeProvider>,
  )
}

beforeEach(() => mockReducedMotion(false))
afterEach(() => vi.unstubAllGlobals())

describe('hero e vitrine', () => {
  it('tem 4 chips em abas e só o painel selecionado visível', () => {
    renderLanding()
    const abas = within(screen.getByRole('tablist', { name: 'Situações do dia a dia' })).getAllByRole('tab')
    expect(abas.map((aba) => aba.textContent)).toEqual(paineis.map((painel) => painel.chip))
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Abrir um chamado' })).toBeVisible()
    expect(screen.getAllByRole('tabpanel', { hidden: true }).filter((p) => p.id.startsWith('hero-painel')).filter((p) => !p.hidden)).toHaveLength(1)
  })

  it('clicar no chip troca o painel e a pergunta da barra "ask"', async () => {
    const user = userEvent.setup()
    renderLanding()
    await user.click(screen.getByRole('tab', { name: 'Ver ordens atrasadas' }))
    expect(screen.getByRole('tab', { name: 'Ver ordens atrasadas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Abrir um chamado' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel', { name: 'Ver ordens atrasadas' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 3, name: 'A fila de trabalho já organizada.' })).toBeVisible()
    expect(screen.getByText('Quais ordens de serviço estão atrasadas?')).toBeInTheDocument()
  })

  it('setas movem a seleção e o foco, com volta circular', async () => {
    const user = userEvent.setup()
    renderLanding()
    const primeira = screen.getByRole('tab', { name: 'Abrir um chamado' })
    primeira.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Consultar um equipamento' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Consultar um equipamento' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Acompanhar indicadores' })).toHaveFocus()
    expect(screen.getByRole('tabpanel', { name: 'Acompanhar indicadores' })).toBeVisible()
  })

  it('o painel de indicadores mostra os valores de exemplo e o gráfico descrito', async () => {
    const user = userEvent.setup()
    renderLanding()
    await user.click(screen.getByRole('tab', { name: 'Acompanhar indicadores' }))
    const painel = screen.getByRole('tabpanel', { name: 'Acompanhar indicadores' })
    for (const valor of ['286 h', '2,4 h', '97,4%']) expect(within(painel).getAllByText(valor).length).toBeGreaterThan(0)
    expect(within(painel).getByText('Valores de exemplo.')).toBeInTheDocument()
    expect(within(painel).getByRole('img', { name: /Disponibilidade mensal, de 95,1% em fevereiro a 97,4% em julho/ })).toBeInTheDocument()
  })

  it('as telas do app têm alt, lazy, async e dimensões', () => {
    renderLanding()
    const imagens = screen.getAllByRole('img', { hidden: true }).filter((img) => img.tagName === 'IMG')
    expect(imagens.length).toBe(5)
    for (const img of imagens) {
      expect(img).toHaveAttribute('alt')
      expect(img.getAttribute('alt')).not.toBe('')
      expect(img).toHaveAttribute('loading', 'lazy')
      expect(img).toHaveAttribute('decoding', 'async')
      expect(img).toHaveAttribute('width', String(TELA_LARGURA))
      expect(img).toHaveAttribute('height', String(TELA_ALTURA))
    }
  })

  it('a barra "ask" e o botão da vitrine chamam o gancho com o interesse do painel', async () => {
    const user = userEvent.setup()
    const onAgendar = vi.fn()
    renderLanding(onAgendar)
    await user.click(screen.getByRole('button', { name: /Quero abrir um chamado para um equipamento/ }))
    expect(onAgendar).toHaveBeenLastCalledWith('chamado')
    await user.click(screen.getByRole('tab', { name: 'Consultar um equipamento' }))
    await user.click(screen.getByRole('button', { name: /Preciso consultar os dados de um equipamento/ }))
    expect(onAgendar).toHaveBeenLastCalledWith('equipamento')
    await user.click(within(screen.getByRole('tabpanel', { name: 'Consultar um equipamento' })).getByRole('button', { name: /demonstração/ }))
    expect(onAgendar).toHaveBeenCalledTimes(3)
  })
})

describe('TelaApp', () => {
  it('renderiza a imagem com alt, lazy e dimensões fixas', () => {
    render(<TelaApp src="/x.webp" alt="Tela de teste" />)
    const img = screen.getByRole('img', { name: 'Tela de teste' })
    expect(img).toHaveAttribute('src', '/x.webp')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('width', '472')
    expect(img).toHaveAttribute('height', '968')
  })
})

describe('recursos, para quem e chamada final', () => {
  it('mostra 6 cartões de recurso', () => {
    renderLanding()
    const secao = screen.getByRole('region', { name: /Tudo o que a rotina precisa/ })
    expect(within(secao).getAllByRole('article')).toHaveLength(6)
    expect(within(secao).getByRole('heading', { level: 3, name: 'App que funciona offline' })).toBeInTheDocument()
  })

  it('mostra os 4 perfis', () => {
    renderLanding()
    const secao = screen.getByRole('region', { name: 'Cada pessoa vê só o que precisa.' })
    const titulos = within(secao).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Administrador', 'Técnico', 'Equipe do hospital', 'Operação da plataforma'])
  })

  it('"Agendar demonstração" da chamada final chama o gancho', async () => {
    const user = userEvent.setup()
    const onAgendar = vi.fn()
    renderLanding(onAgendar)
    const secao = screen.getByRole('region', { name: new RegExp(`Veja o ${NOME_PRODUTO}`) })
    await user.click(within(secao).getByRole('button', { name: 'Agendar demonstração' }))
    expect(onAgendar).toHaveBeenCalledTimes(1)
  })

  it('sem gancho, rola até #contato', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderLanding()
    const secao = screen.getByRole('region', { name: new RegExp(`Veja o ${NOME_PRODUTO}`) })
    await user.click(within(secao).getByRole('button', { name: 'Agendar demonstração' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.instances[0]).toBe(document.getElementById('contato'))
  })
})

describe('conformidade', () => {
  it('tem 7 abas de norma e troca o conteúdo', async () => {
    const user = userEvent.setup()
    renderLanding()
    const lista = screen.getByRole('tablist', { name: 'Normas' })
    const abas = within(lista).getAllByRole('tab')
    expect(abas).toHaveLength(7)
    expect(abas.map((aba) => aba.textContent)).toEqual(normas.map((norma) => norma.sigla))
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'LGPD' }))
    expect(screen.getByRole('tab', { name: 'LGPD' })).toHaveAttribute('aria-selected', 'true')
    expect(abas[0]).toHaveAttribute('aria-selected', 'false')
    const painel = screen.getByRole('tabpanel', { name: 'LGPD' })
    expect(painel).toBeVisible()
    expect(within(painel).getByText(/Proteção de dados pessoais/)).toBeInTheDocument()
    expect(within(painel).getAllByRole('listitem')).toHaveLength(3)
    expect(document.getElementById('norma-painel-rdc509')).toHaveAttribute('hidden')
  })

  it('setas ←/→ navegam entre as normas', async () => {
    const user = userEvent.setup()
    renderLanding()
    screen.getByRole('tab', { name: 'RDC 509/2021' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'NBR IEC 62353' })).toHaveFocus()
    expect(screen.getByRole('tabpanel', { name: 'NBR IEC 62353' })).toBeVisible()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'LGPD' })).toHaveFocus()
  })

  it('mostra a trilha de 3 blocos e a nota de limitação com o nome do produto', () => {
    renderLanding()
    const secao = screen.getByRole('region', { name: /As normas viram parte do trabalho/ })
    for (const etapa of ['No cadastro', 'Na medição', 'Na gestão']) expect(within(secao).getByText(etapa)).toBeInTheDocument()
    expect(within(secao).getByText(`${NOME_PRODUTO} apoia o cumprimento das normas, mas não substitui o responsável técnico nem a avaliação regulatória da instituição.`)).toBeInTheDocument()
  })
})

describe('revelação ao rolar', () => {
  class FakeObserver {
    static instances: FakeObserver[] = []
    callback: (entries: { isIntersecting: boolean }[]) => void
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
      this.callback = callback
      FakeObserver.instances.push(this)
    }
    observe = vi.fn()
    disconnect = vi.fn()
  }

  beforeEach(() => {
    FakeObserver.instances = []
    vi.stubGlobal('IntersectionObserver', FakeObserver)
  })

  it('começa pendente e revela quando entra na tela', async () => {
    const { act } = await import('@testing-library/react')
    const { container } = render(<Reveal>conteúdo</Reveal>)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveAttribute('data-reveal', 'pending')
    act(() => FakeObserver.instances[0].callback([{ isIntersecting: true }]))
    expect(el).toHaveAttribute('data-reveal', 'in')
  })

  it('com prefers-reduced-motion nada é ocultado nem observado', () => {
    mockReducedMotion(true)
    const { container } = render(<Reveal>conteúdo</Reveal>)
    expect(container.firstElementChild).not.toHaveAttribute('data-reveal')
    expect(FakeObserver.instances).toHaveLength(0)
  })

  it('a landing inteira não oculta nada com reduced motion', () => {
    mockReducedMotion(true)
    const { container } = renderLanding()
    expect(container.querySelector('[data-reveal]')).toBeNull()
  })

  it('a landing usa revelação quando o movimento é permitido', () => {
    const { container } = renderLanding()
    expect(container.querySelectorAll('[data-reveal="pending"]').length).toBeGreaterThan(8)
  })
})
