import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hex, lerTokens, misturar, razaoContraste, type Rgb } from './contraste'

const raiz = path.resolve(import.meta.dirname, '../../../..')
const indexCss = readFileSync(path.join(raiz, 'src/index.css'), 'utf8')
const landingCss = readFileSync(path.join(raiz, 'src/features/landing/landing.css'), 'utf8')

const bloco = (css: string, cabecalho: RegExp) => {
  const m = cabecalho.exec(css)
  if (!m) throw new Error(`bloco não encontrado: ${cabecalho}`)
  return m[1]
}

const base = {
  escuro: lerTokens(bloco(indexCss, /:root,\s*\.dark\s*\{([^}]*)\}/)),
  claro: lerTokens(bloco(indexCss, /\.light,\s*\.auto\s*\{([^}]*)\}/)),
}
const ajustes = {
  escuro: lerTokens(bloco(landingCss, /^\.landing\s*\{([^}]*)\}/m)),
  claro: lerTokens(bloco(landingCss, /\.light \.landing,\s*\.auto \.landing\s*\{([^}]*)\}/)),
  autoEscuro: lerTokens(bloco(landingCss, /prefers-color-scheme: dark\)\s*\{\s*\.auto \.landing\s*\{([^}]*)\}/)),
}

/** Tokens efetivos do `.landing` em cada tema (globais + ajustes da landing). Primário claro "texto" cai no próprio --primary. */
function tema(nome: 'escuro' | 'claro') {
  const t = { ...base[nome], ...ajustes[nome] }
  const c = (token: string) => hex(t[token] ?? base[nome][token.replace('-text', '')])
  const preto: Rgb = [0, 0, 0]
  const bg = c('--bg')
  const surface = c('--surface')
  const primary = c('--primary')
  const danger = c('--danger')
  const warning = c('--warning')
  return {
    fundos: {
      bg,
      surface,
      'bg-deep': misturar(bg, 0.88, preto),
      'surface-hi': misturar(surface, 0.9, c('--text-primary')),
      'primary-soft/bg': misturar(primary, 0.12, bg),
      'primary-soft/surface': misturar(primary, 0.12, surface),
      'danger-soft/bg': misturar(danger, 0.14, bg),
      'danger-soft/surface': misturar(danger, 0.14, surface),
      'cta (primary 22%/surface)': misturar(primary, 0.22, surface),
    } as Record<string, Rgb>,
    textoPrimario: c('--text-primary'),
    textoSecundario: c('--text-secondary'),
    textoMuted: c('--text-muted'),
    primaryTexto: c('--primary-text'),
    dangerTexto: c('--danger-text'),
    primary,
    primaryHover: c('--primary-hover'),
    ink: misturar(primary, 0.15, preto),
    onWarn: misturar(warning, 0.2, preto),
    warning,
    avisoBg: { bg: misturar(warning, 0.18, bg), surface: misturar(warning, 0.18, surface), pendenteBg: misturar(warning, 0.3, bg), pendenteSurface: misturar(warning, 0.3, surface) },
  }
}

describe.each(['escuro', 'claro'] as const)('contraste AA no tema %s', (nome) => {
  const t = tema(nome)
  const fundosTexto = Object.entries(t.fundos)

  it.each(fundosTexto)('texto principal e secundário sobre %s >= 4.5', (_nome, fundo) => {
    expect(razaoContraste(t.textoPrimario, fundo)).toBeGreaterThanOrEqual(4.5)
    if (_nome !== 'cta (primary 22%/surface)') expect(razaoContraste(t.textoSecundario, fundo)).toBeGreaterThanOrEqual(4.5)
  })

  // O CTA final só usa texto principal/secundário (ChamadaFinal), nunca muted.
  it.each(fundosTexto.filter(([n]) => !n.startsWith('cta')))('texto muted sobre %s >= 4.5', (_nome, fundo) => {
    expect(razaoContraste(t.textoMuted, fundo)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(fundosTexto.filter(([n]) => !n.startsWith('danger-soft')))('texto primário (links, chips, rótulos) sobre %s >= 4.5', (_nome, fundo) => {
    expect(razaoContraste(t.primaryTexto, fundo)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(fundosTexto.filter(([n]) => n === 'bg' || n === 'surface' || n.startsWith('danger-soft')))('texto de erro sobre %s >= 4.5', (_nome, fundo) => {
    expect(razaoContraste(t.dangerTexto, fundo)).toBeGreaterThanOrEqual(4.5)
  })

  it('botão primário (tinta sobre verde, também no hover) e etiqueta de aviso >= 4.5', () => {
    expect(razaoContraste(t.ink, t.primary)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(t.ink, t.primaryHover)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(t.onWarn, t.warning)).toBeGreaterThanOrEqual(4.5)
  })

  it('aviso provisório e trechos [PENDENTE] legíveis >= 4.5', () => {
    for (const fundo of Object.values(t.avisoBg)) expect(razaoContraste(t.textoPrimario, fundo)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('tokens da landing', () => {
  it('o tema automático escuro repete exatamente os ajustes do escuro', () => {
    expect(ajustes.autoEscuro).toEqual({ '--text-muted': ajustes.escuro['--text-muted'], '--danger-text': ajustes.escuro['--danger-text'] })
  })

  it('o tom muted global do tema claro reprovaria (prova de que o ajuste é necessário)', () => {
    expect(razaoContraste(hex(base.claro['--text-muted']), hex(base.claro['--bg']))).toBeLessThan(4.5)
  })
})
