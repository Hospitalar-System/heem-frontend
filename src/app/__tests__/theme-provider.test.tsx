/* eslint-disable testing-library/no-node-access -- o alvo é o <meta> do <head>, fora da árvore renderizada */
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../theme-provider'

function prepararMeta() {
  document.head.querySelector('meta[name="theme-color"]')?.remove()
  const meta = document.createElement('meta')
  meta.setAttribute('name', 'theme-color')
  meta.setAttribute('content', '#1F1F1F')
  document.head.appendChild(meta)
  return meta
}

describe('ThemeProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('dark', 'light', 'auto')
    document.documentElement.style.removeProperty('--bg')
  })

  it('abre no tema escuro quando o armazenamento está bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    render(<ThemeProvider><p>conteúdo</p></ThemeProvider>)
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('respeita a preferência salva', () => {
    localStorage.setItem('heem-theme-mode', 'light')
    render(<ThemeProvider><p>x</p></ThemeProvider>)
    expect(document.documentElement).toHaveClass('light')
  })

  it('copia o fundo do tema para o meta theme-color', () => {
    const meta = prepararMeta()
    document.documentElement.style.setProperty('--bg', '#f4f5f7')
    render(<ThemeProvider><p>x</p></ThemeProvider>)
    expect(meta.getAttribute('content')).toBe('#f4f5f7')
  })
})
