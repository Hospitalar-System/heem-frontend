/* eslint-disable testing-library/no-node-access, testing-library/no-container -- as metas ficam em document.head, fora da árvore acessível */
import { act, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOME_PRODUTO } from '../brand'
import { AVISO_PROVISORIO, VERSAO_POLITICA, politicaPrivacidade, termosDeUso } from '../legais/conteudo'

/** Renderiza o roteador REAL do app em `caminho` (o router é criado na importação, então reiniciamos os módulos). */
async function abrir(caminho: string) {
  window.history.pushState({}, '', caminho)
  vi.resetModules()
  const { AppRouter } = await import('@/app/router')
  const { ThemeProvider } = await import('@/app/theme-provider')
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  document.head.innerHTML = '<title>Sistema</title><meta name="description" content="Descrição do sistema">'
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  document.head.innerHTML = ''
})

describe.each([
  ['/privacidade', politicaPrivacidade],
  ['/termos', termosDeUso],
] as const)('rota %s', (caminho, documento) => {
  it('existe, renderiza o título, o aviso provisório e a versão', async () => {
    await abrir(caminho)
    expect(await screen.findByRole('heading', { level: 1, name: documento.titulo })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('note')).toHaveTextContent(AVISO_PROVISORIO)
    expect(screen.getByRole('note')).toHaveTextContent(`Versão: ${VERSAO_POLITICA}.`)
    expect(VERSAO_POLITICA).toBe('provisoria-1')
    expect(screen.queryByText(/ainda está em desenvolvimento/)).not.toBeInTheDocument()
  })

  it('destaca todos os [PENDENTE] e não deixa nenhum fora do realce', async () => {
    const { container } = await abrir(caminho)
    await screen.findByRole('heading', { level: 1, name: documento.titulo })
    const destacados = Array.from(container.querySelectorAll('mark.landing-pendente'))
    const esperados = JSON.stringify(documento).match(/\[PENDENTE[^\]]*\]/g) ?? []
    expect(esperados.length).toBeGreaterThan(3)
    expect(destacados.map((el) => el.textContent)).toEqual(esperados)
    expect((container.textContent ?? '').match(/\[PENDENTE/g)).toHaveLength(esperados.length)
  })

  it('tem uma seção com âncora por item do índice e hierarquia h1 > h2', async () => {
    await abrir(caminho)
    await screen.findByRole('heading', { level: 1, name: documento.titulo })
    const indice = screen.getByRole('navigation', { name: 'Nesta página' })
    for (const secao of documento.secoes) {
      expect(within(indice).getByRole('link', { name: secao.titulo })).toHaveAttribute('href', `#${secao.id}`)
      expect(screen.getByRole('heading', { level: 2, name: secao.titulo }).closest('section')).toHaveAttribute('id', secao.id)
    }
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('tem título e metas próprios, com link "Voltar à página inicial"', async () => {
    await abrir(caminho)
    await screen.findByRole('heading', { level: 1, name: documento.titulo })
    expect(document.title).toBe(`${documento.titulo} | ${NOME_PRODUTO}`)
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', documento.descricao)
    expect(document.head.querySelector('meta[property="og:url"]')).toHaveAttribute('content', caminho)
    for (const link of screen.getAllByRole('link', { name: 'Voltar à página inicial' })) expect(link).toHaveAttribute('href', '/')
  })

  it('mantém nav e rodapé da landing, apontando as âncoras para a landing', async () => {
    await abrir(caminho)
    await screen.findByRole('heading', { level: 1, name: documento.titulo })
    const nav = screen.getByRole('navigation', { name: 'Seções da página' })
    expect(within(nav).getByRole('link', { name: 'Recursos' })).toHaveAttribute('href', '/#recursos')
    const rodape = screen.getByRole('navigation', { name: 'Rodapé' })
    expect(within(rodape).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
    expect(within(rodape).getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos')
  })
})

describe('ligações e vazamento de metas', () => {
  it('o rodapé da landing leva às duas páginas legais', async () => {
    const user = userEvent.setup()
    await abrir('/')
    const rodape = await screen.findByRole('navigation', { name: 'Rodapé' })
    await user.click(within(rodape).getByRole('link', { name: 'Termos' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/termos')
    await user.click(within(screen.getByRole('navigation', { name: 'Rodapé' })).getByRole('link', { name: 'Política de Privacidade' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/privacidade')
  })

  it('"Voltar à página inicial" volta à landing', async () => {
    const user = userEvent.setup()
    await abrir('/privacidade')
    await user.click((await screen.findAllByRole('link', { name: 'Voltar à página inicial' }))[0])
    expect(await screen.findByRole('heading', { level: 1, name: /em ordem/ })).toBeInTheDocument()
  })

  it('o consentimento do formulário aponta para /privacidade, que existe', async () => {
    const user = userEvent.setup()
    const view = await abrir('/')
    await user.click((await screen.findAllByRole('button', { name: 'Agendar demonstração' }))[0])
    const link = within(await screen.findByRole('dialog')).getByRole('link', { name: 'Política de Privacidade' })
    expect(link).toHaveAttribute('href', '/privacidade')
    view.unmount()
    await abrir('/privacidade')
    expect(await screen.findByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument()
  })

  it('a landing define as metas e sair para o sistema as restaura', async () => {
    const view = await abrir('/')
    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toContain(NOME_PRODUTO)
    expect(document.head.querySelector('meta[property="og:title"]')).not.toBeNull()
    view.unmount()
    expect(document.title).toBe('Sistema')
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Descrição do sistema')
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull()
  })

  it('o sistema (/login) não carrega as metas da landing', async () => {
    await abrir('/login')
    await act(async () => {
      await Promise.resolve()
    })
    expect(document.title).toBe('Sistema')
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull()
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })
})
