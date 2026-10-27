import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8')
const rule = (selector: string) => css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''

describe('separador de linha compartilhado', () => {
  it('.row-divider usa o token de borda em baixa opacidade, sem branco puro', () => {
    const body = rule('.row-divider')
    expect(body).toMatch(/border-bottom:\s*1px solid color-mix\(in srgb, var\(--border\) \d+%, transparent\)/)
    expect(body).not.toMatch(/#fff|white|rgb\(255/i)
  })

  it('a última linha não ganha separador e o cabeçalho de tabela também é suave', () => {
    expect(css).toMatch(/\.row-divider:last-child\s*\{\s*border-bottom-width:\s*0/)
    expect(rule('.table-head')).toMatch(/color-mix\(in srgb, var\(--border\)/)
  })
})
