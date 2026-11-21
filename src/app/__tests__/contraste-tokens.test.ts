import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hex, lerTokens, razaoContraste } from '../../features/landing/__tests__/contraste'

const raiz = path.resolve(import.meta.dirname, '../../..')
const indexCss = readFileSync(path.join(raiz, 'src/index.css'), 'utf8')

const bloco = (cabecalho: RegExp) => {
  const m = cabecalho.exec(indexCss)
  if (!m) throw new Error(`bloco não encontrado: ${cabecalho}`)
  return lerTokens(m[1])
}

const temas = {
  escuro: bloco(/:root,\s*\.dark\s*\{([^}]*)\}/),
  claro: bloco(/\.light,\s*\.auto\s*\{([^}]*)\}/),
  autoEscuro: bloco(/prefers-color-scheme: dark\)\s*\{\s*\.auto\s*\{([^}]*)\}/),
}

/** Fundos onde o painel desenha texto: página, cartão, cartão elevado e faixa de marca. */
const fundos = ['--bg', '--surface', '--surface-hi', '--bg-brand'] as const

describe.each(Object.entries(temas))('contraste AA do texto do painel no tema %s', (_nome, t) => {
  it.each(fundos)('texto principal, secundário e de apoio sobre %s >= 4,5:1', (fundo) => {
    for (const texto of ['--text-primary', '--text-secondary', '--text-muted']) {
      expect(razaoContraste(hex(t[texto]), hex(t[fundo]))).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('tema automático escuro', () => {
  it('usa o mesmo texto de apoio do tema escuro', () => {
    expect(temas.autoEscuro['--text-muted']).toBe(temas.escuro['--text-muted'])
  })
})
