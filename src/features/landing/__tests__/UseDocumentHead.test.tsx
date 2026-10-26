/* eslint-disable testing-library/no-node-access -- as metas ficam em document.head, fora da árvore acessível */
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useDocumentHead } from '../useDocumentHead'

function Pagina({ titulo = 'Título da rota' }: { titulo?: string }) {
  useDocumentHead({ title: titulo, description: 'Descrição da rota', path: '/rota' })
  return null
}

const meta = (chave: string) => document.head.querySelector(`meta[name="${chave}"], meta[property="${chave}"]`)

beforeEach(() => {
  document.head.innerHTML = '<title>Sistema</title><meta name="description" content="Descrição do sistema"><meta property="og:title" content="OG do sistema">'
})
afterEach(() => {
  document.head.innerHTML = ''
})

describe('useDocumentHead', () => {
  it('define título, description, Open Graph e Twitter Card ao montar', () => {
    render(<Pagina />)
    expect(document.title).toBe('Título da rota')
    expect(meta('description')).toHaveAttribute('content', 'Descrição da rota')
    expect(meta('og:title')).toHaveAttribute('content', 'Título da rota')
    expect(meta('og:description')).toHaveAttribute('content', 'Descrição da rota')
    expect(meta('og:type')).toHaveAttribute('content', 'website')
    expect(meta('og:locale')).toHaveAttribute('content', 'pt_BR')
    expect(meta('og:url')).toHaveAttribute('content', '/rota')
    expect(meta('og:image')).toHaveAttribute('content', '/og-landing.png')
    expect(meta('twitter:card')).toHaveAttribute('content', 'summary_large_image')
    expect(meta('twitter:title')).toHaveAttribute('content', 'Título da rota')
    expect(meta('twitter:description')).toHaveAttribute('content', 'Descrição da rota')
    expect(meta('twitter:image')).toHaveAttribute('content', '/og-landing.png')
  })

  it('não duplica metas existentes (atualiza a mesma tag)', () => {
    render(<Pagina />)
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
  })

  it('restaura o que havia e remove o que criou ao desmontar (não vaza no resto do sistema)', () => {
    const { unmount } = render(<Pagina />)
    unmount()
    expect(document.title).toBe('Sistema')
    expect(meta('description')).toHaveAttribute('content', 'Descrição do sistema')
    expect(meta('og:title')).toHaveAttribute('content', 'OG do sistema')
    for (const chave of ['og:description', 'og:url', 'og:image', 'og:type', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:image']) {
      expect(meta(chave)).toBeNull()
    }
  })

  it('atualiza quando o título muda e ainda restaura o original', () => {
    const { rerender, unmount } = render(<Pagina titulo="A" />)
    rerender(<Pagina titulo="B" />)
    expect(document.title).toBe('B')
    expect(meta('og:title')).toHaveAttribute('content', 'B')
    unmount()
    expect(document.title).toBe('Sistema')
  })
})
