/** Utilitários de contraste WCAG (sRGB) usados pelo teste de acessibilidade da landing. */
export type Rgb = [number, number, number]

export function hex(valor: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(valor.trim())
  if (!m) throw new Error(`cor inválida: ${valor}`)
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb
}

/** Equivale a `color-mix(in srgb, cor pct%, base)`: `cor` com `pct` de peso sobre `base` opaca. */
export function misturar(cor: Rgb, pct: number, base: Rgb): Rgb {
  return cor.map((v, i) => v * pct + base[i] * (1 - pct)) as Rgb
}

function luminancia([r, g, b]: Rgb) {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

export function razaoContraste(a: Rgb, b: Rgb): number {
  const [x, y] = [luminancia(a), luminancia(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Lê `--token: #hex;` de um bloco CSS. */
export function lerTokens(bloco: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of bloco.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2]
  return out
}
